use std::path::PathBuf;
use std::process::Command;
use sysinfo::{Pid, System};
use tracing::{debug, error, info, warn};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/// The type of AI application detected on the endpoint.
/// Each variant maps to a specific interception channel.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AiTarget {
    /// ChatGPT Desktop (Electron) -> Interception via CDP on port 9222
    ChatGptDesktop,
    /// Claude Desktop (Electron) -> Interception via CDP on port 9223
    ClaudeDesktop,
    /// Claude Code CLI (native Node.js) -> Interception via HTTPS Proxy on localhost:8899
    ClaudeCodeCli,
    /// Cursor IDE (Electron, fork of VS Code) -> Interception via HTTPS Proxy
    CursorIde,
    /// Windsurf IDE (Codeium, fork of VS Code) -> Interception via HTTPS Proxy
    WindsurfIde,
    /// VS Code with AI extensions (Copilot, Claude, Cline, etc.) -> Interception via HTTPS Proxy
    VsCodeWithAi,
    /// Google Antigravity IDE -> Detection only (custom protocol, limited interception)
    AntigravityIde,
}

impl AiTarget {
    pub fn display_name(&self) -> &str {
        match self {
            AiTarget::ChatGptDesktop => "ChatGPT Desktop",
            AiTarget::ClaudeDesktop => "Claude Desktop",
            AiTarget::ClaudeCodeCli => "Claude Code (CLI)",
            AiTarget::CursorIde => "Cursor IDE",
            AiTarget::WindsurfIde => "Windsurf IDE",
            AiTarget::VsCodeWithAi => "VS Code (AI)",
            AiTarget::AntigravityIde => "Antigravity IDE",
        }
    }

    pub fn cdp_port(&self) -> Option<u16> {
        match self {
            AiTarget::ChatGptDesktop => Some(9222),
            AiTarget::ClaudeDesktop => Some(9223),
            // All others use HTTPS proxy, not CDP
            _ => None,
        }
    }

    pub fn is_electron(&self) -> bool {
        matches!(self, AiTarget::ChatGptDesktop | AiTarget::ClaudeDesktop)
    }

    /// Whether this target is monitored via the HTTPS proxy channel.
    pub fn uses_proxy(&self) -> bool {
        matches!(
            self,
            AiTarget::ClaudeCodeCli
                | AiTarget::CursorIde
                | AiTarget::WindsurfIde
                | AiTarget::VsCodeWithAi
                | AiTarget::AntigravityIde
        )
    }

    pub fn api_domain(&self) -> &str {
        match self {
            AiTarget::ChatGptDesktop => "chatgpt.com",
            AiTarget::ClaudeDesktop => "claude.ai",
            AiTarget::ClaudeCodeCli => "api.anthropic.com",
            AiTarget::CursorIde => "api2.cursor.sh",
            AiTarget::WindsurfIde => "api.codeium.com",
            AiTarget::VsCodeWithAi => "multiple",
            AiTarget::AntigravityIde => "googleapis.com",
        }
    }
}

/// A detected AI process with full classification information.
#[derive(Debug, Clone)]
pub struct DetectedAiProcess {
    pub pid: u32,
    pub target: AiTarget,
    pub name: String,
    pub exe_path: Option<String>,
    pub parent_name: Option<String>,
    pub cmd_args: Vec<String>,
}

impl DetectedAiProcess {
    /// Returns true if this Electron process already has the debug port flag.
    pub fn has_debug_flag(&self) -> bool {
        self.cmd_args
            .iter()
            .any(|arg| arg.contains("--remote-debugging-port"))
    }

    /// Returns the appropriate debug port flag for this target (Electron only).
    pub fn debug_flag(&self) -> Option<String> {
        self.target
            .cdp_port()
            .map(|port| format!("--remote-debugging-port={}", port))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ProcessDetector
// ─────────────────────────────────────────────────────────────────────────────

/// Detects and classifies AI application processes running on the endpoint.
pub struct ProcessDetector {
    system: System,
}

impl ProcessDetector {
    pub fn new() -> Self {
        Self {
            system: System::new_all(),
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /// Scan all processes and return a list of detected AI applications.
    /// Sub-processes of Electron (renderers, GPU, utility) are filtered out automatically.
    pub fn scan_ai_processes(&mut self) -> Vec<DetectedAiProcess> {
        self.system.refresh_all();
        let mut results: Vec<DetectedAiProcess> = Vec::new();

        for (pid, process) in self.system.processes() {
            let name = process.name().to_string_lossy().to_lowercase();
            let cmd: Vec<String> = process
                .cmd()
                .iter()
                .map(|s| s.to_string_lossy().to_string())
                .collect();

            // ── Step 1: Quick name-based routing ─────────────────────────────
            let name_matches_chatgpt = name.contains("chatgpt");
            let name_matches_claude = name.contains("claude") && !name.contains("chatgpt");
            let name_matches_cursor = name.contains("cursor") && !name.contains("cursorless");
            let name_matches_windsurf = name.contains("windsurf") || name.contains("codeium");
            let name_matches_antigravity = name.contains("antigravity");

            let is_known_ai = name_matches_chatgpt
                || name_matches_claude
                || name_matches_cursor
                || name_matches_windsurf
                || name_matches_antigravity;

            if !is_known_ai {
                continue;
            }

            // ── Step 2: Discard Electron child processes ──────────────────────
            // Electron spawns renderer, GPU, utility sub-processes with --type= flags.
            // We only want the main browser process.
            let is_electron_child = cmd.iter().any(|arg| arg.starts_with("--type="));
            if is_electron_child {
                debug!("Skipping Electron child process: {} (PID {})", name, pid);
                continue;
            }

            let exe_path = process.exe().map(|p| p.to_string_lossy().to_string());
            let parent_name = self.get_parent_name(process);

            // ── Step 3: ChatGPT is unambiguous — route directly ───────────────
            if name_matches_chatgpt {
                debug!("Detected ChatGPT Desktop process (PID {})", pid);
                results.push(DetectedAiProcess {
                    pid: pid.as_u32(),
                    target: AiTarget::ChatGptDesktop,
                    name: process.name().to_string_lossy().to_string(),
                    exe_path,
                    parent_name,
                    cmd_args: cmd,
                });
                continue;
            }

            // ── Step 4: IDE AI targets (Cursor, Windsurf, Antigravity) ────────
            if name_matches_cursor {
                debug!("Detected Cursor IDE (PID {})", pid);
                results.push(DetectedAiProcess {
                    pid: pid.as_u32(),
                    target: AiTarget::CursorIde,
                    name: process.name().to_string_lossy().to_string(),
                    exe_path,
                    parent_name,
                    cmd_args: cmd,
                });
                continue;
            }

            if name_matches_windsurf {
                debug!("Detected Windsurf/Codeium IDE (PID {})", pid);
                results.push(DetectedAiProcess {
                    pid: pid.as_u32(),
                    target: AiTarget::WindsurfIde,
                    name: process.name().to_string_lossy().to_string(),
                    exe_path,
                    parent_name,
                    cmd_args: cmd,
                });
                continue;
            }

            if name_matches_antigravity {
                debug!("Detected Antigravity IDE (PID {})", pid);
                results.push(DetectedAiProcess {
                    pid: pid.as_u32(),
                    target: AiTarget::AntigravityIde,
                    name: process.name().to_string_lossy().to_string(),
                    exe_path,
                    parent_name,
                    cmd_args: cmd,
                });
                continue;
            }

            // ── Step 5: Claude — classify Desktop vs CLI ──────────────────────
            let target = Self::classify_claude_process(&exe_path, &parent_name);

            match &target {
                AiTarget::ClaudeDesktop => debug!("Detected Claude Desktop (PID {})", pid),
                AiTarget::ClaudeCodeCli => debug!("Detected Claude Code CLI (PID {})", pid),
                other => debug!("Claude process classified as {:?} (PID {})", other, pid),
            }

            results.push(DetectedAiProcess {
                pid: pid.as_u32(),
                target,
                name: process.name().to_string_lossy().to_string(),
                exe_path,
                parent_name,
                cmd_args: cmd,
            });
        }

        results
    }

    /// Convenience: check if ChatGPT Desktop is running (backwards-compat).
    pub fn is_chatgpt_running(&mut self) -> bool {
        self.scan_ai_processes()
            .iter()
            .any(|p| p.target == AiTarget::ChatGptDesktop)
    }

    /// Get the main ChatGPT process (backwards-compat for the existing CDP flow).
    pub fn get_chatgpt_process(&mut self) -> Option<DetectedAiProcess> {
        self.scan_ai_processes()
            .into_iter()
            .find(|p| p.target == AiTarget::ChatGptDesktop)
    }

    /// Get the main Claude Desktop process.
    pub fn get_claude_desktop_process(&mut self) -> Option<DetectedAiProcess> {
        self.scan_ai_processes()
            .into_iter()
            .find(|p| p.target == AiTarget::ClaudeDesktop)
    }

    /// Get all Claude Code CLI processes (there can be multiple terminal sessions).
    pub fn get_claude_code_processes(&mut self) -> Vec<DetectedAiProcess> {
        self.scan_ai_processes()
            .into_iter()
            .filter(|p| p.target == AiTarget::ClaudeCodeCli)
            .collect()
    }

    /// Kill a process by PID.
    pub fn kill_process(&mut self, pid: u32) -> bool {
        self.system.refresh_all();
        let system_pid = Pid::from_u32(pid);

        if let Some(process) = self.system.process(system_pid) {
            info!(
                "Attempting to kill process {} ({})",
                pid,
                process.name().to_string_lossy()
            );
            if process.kill() {
                info!("Process {} killed successfully", pid);
                return true;
            } else {
                error!("Failed to kill process {}", pid);
            }
        } else {
            warn!("Process {} not found to kill", pid);
        }
        false
    }

    /// Relaunch an Electron app with the appropriate `--remote-debugging-port` flag.
    // SECURITY NOTE: CDP port is accessible to all local processes.
    // Consider using --remote-debugging-pipe instead of --remote-debugging-port for production.
    pub fn relaunch_with_debug_port(&self, process: &DetectedAiProcess) -> bool {
        let exe_path = match &process.exe_path {
            Some(p) => p.clone(),
            None => {
                error!(
                    "Cannot relaunch {}: exe_path unknown",
                    process.target.display_name()
                );
                return false;
            }
        };

        let port = match process.target.cdp_port() {
            Some(p) => p,
            None => {
                error!(
                    "Cannot relaunch {}: not an Electron target",
                    process.target.display_name()
                );
                return false;
            }
        };

        let flag = format!("--remote-debugging-port={}", port);
        info!(
            "Relaunching {} with {} from: {}",
            process.target.display_name(),
            flag,
            exe_path
        );

        self.launch_with_args(&exe_path, &[&flag])
    }

    // ── Shortcut Patching ─────────────────────────────────────────────────────

    /// Patch OS shortcuts so the app always starts with the debug port flag.
    #[cfg(target_os = "windows")]
    pub fn patch_shortcuts(&self) -> Result<(), String> {
        let shortcuts = vec![
            format!(
                "{}\\Desktop\\ChatGPT.lnk",
                std::env::var("USERPROFILE").unwrap_or_default()
            ),
            format!(
                "{}\\Microsoft\\Windows\\Start Menu\\Programs\\ChatGPT.lnk",
                std::env::var("APPDATA").unwrap_or_default()
            ),
            format!(
                "{}\\Desktop\\Claude.lnk",
                std::env::var("USERPROFILE").unwrap_or_default()
            ),
            format!(
                "{}\\Microsoft\\Windows\\Start Menu\\Programs\\Claude.lnk",
                std::env::var("APPDATA").unwrap_or_default()
            ),
        ];

        let shortcut_list = shortcuts.join("\",\n            \"");
        let script = format!(
            r#"
        $WScript = New-Object -ComObject WScript.Shell
        $PortMap = @{{
            "*ChatGPT*" = "--remote-debugging-port=9222"
            "*Claude*"  = "--remote-debugging-port=9223"
        }}
        $Shortcuts = @(
            "{shortcut_list}"
        )
        foreach ($Path in $Shortcuts) {{
            if (Test-Path $Path) {{
                $Shortcut = $WScript.CreateShortcut($Path)
                foreach ($pattern in $PortMap.Keys) {{
                    if ($Path -like $pattern) {{
                        $flag = $PortMap[$pattern]
                        if ($Shortcut.Arguments -notlike "*$flag*") {{
                            $Shortcut.Arguments = "$($Shortcut.Arguments) $flag"
                            $Shortcut.Save()
                            Write-Host "Patched: $Path with $flag"
                        }}
                    }}
                }}
            }}
        }}
        "#,
            shortcut_list = shortcut_list
        );

        match Command::new("powershell")
            .arg("-Command")
            .arg(&script)
            .output()
        {
            Ok(output) => {
                if output.status.success() {
                    info!(
                        "Shortcuts patched: {}",
                        String::from_utf8_lossy(&output.stdout)
                    );
                    Ok(())
                } else {
                    Err(format!(
                        "PS Error: {}",
                        String::from_utf8_lossy(&output.stderr)
                    ))
                }
            }
            Err(e) => Err(e.to_string()),
        }
    }

    #[cfg(target_os = "linux")]
    pub fn patch_shortcuts(&self) -> Result<(), String> {
        let home = std::env::var("HOME").unwrap_or("/tmp".to_string());
        let targets = vec![
            ("chatgpt.desktop", "--remote-debugging-port=9222"),
            ("claude-desktop.desktop", "--remote-debugging-port=9223"),
        ];

        for (filename, flag) in targets {
            let path = PathBuf::from(&home)
                .join(".local/share/applications")
                .join(filename);
            if !path.exists() {
                continue;
            }
            let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            if content.contains(flag) {
                continue; // Already patched
            }
            let patched: Vec<String> = content
                .lines()
                .map(|line| {
                    if line.starts_with("Exec=") && !line.contains("--remote-debugging-port") {
                        format!("{} {}", line, flag)
                    } else {
                        line.to_string()
                    }
                })
                .collect();
            std::fs::write(&path, patched.join("\n")).map_err(|e| e.to_string())?;
            info!("Patched Linux .desktop file: {:?}", path);
        }
        Ok(())
    }

    #[cfg(target_os = "macos")]
    pub fn patch_shortcuts(&self) -> Result<(), String> {
        info!("Shortcut patching not needed on macOS — relying on Smart Relaunch.");
        Ok(())
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    /// Classify a "claude" process as Desktop (Electron) or Code (CLI).
    ///
    /// Uses 3 cascading criteria:
    /// 1. Exe path  — most reliable
    /// 2. Parent process name — good fallback
    /// 3. Default to CLI (conservative: at worst we start a proxy unnecessarily)
    fn classify_claude_process(
        exe_path: &Option<String>,
        parent_name: &Option<String>,
    ) -> AiTarget {
        // ── Criterion 1: Exe path ─────────────────────────────────────────────
        if let Some(path) = exe_path {
            let p = path.to_lowercase();

            // Desktop installers put the binary in known locations:
            //   Windows: ...\Programs\claude-desktop\...
            //   macOS:   .../Claude.app/...
            //   Linux:   /opt/Claude/...
            let desktop_paths = [
                "claude-desktop",
                "claude.app",
                "/opt/claude",
                "programs\\claude\\", // Windows NSIS installer pattern
            ];

            if desktop_paths.iter().any(|dp| p.contains(dp)) {
                return AiTarget::ClaudeDesktop;
            }

            // CLI native installer puts binary in:
            //   Unix:    ~/.local/bin/claude
            //   Windows: %USERPROFILE%\.local\bin\claude.exe
            // Also handles old npm install: .../node_modules/.bin/claude
            let cli_paths = [
                ".local/bin/claude",
                ".local\\bin\\claude",
                "node_modules/.bin/claude",
                "node_modules\\.bin\\claude",
            ];

            if cli_paths.iter().any(|cp| p.contains(cp)) {
                return AiTarget::ClaudeCodeCli;
            }
        }

        // ── Criterion 2: Parent process ───────────────────────────────────────
        if let Some(parent) = parent_name {
            let p = parent.to_lowercase();

            // If spawned from a shell/terminal → it's Claude Code CLI
            const TERMINAL_PARENTS: &[&str] = &[
                "bash",
                "zsh",
                "sh",
                "fish",
                "dash",
                "powershell",
                "pwsh",
                "cmd",
                "wsl",
                "wt",
                "windowsterminal",
                "alacritty",
                "kitty",
                "iterm2",
                "terminal",
                "gnome-terminal",
                "konsole",
                "xterm",
                "warp",
                "hyper",
                "tilix",
                "terminator",
                "code",
                "code-insiders", // VS Code integrated terminal
            ];

            // If spawned from GUI launcher → it's Claude Desktop
            const GUI_PARENTS: &[&str] = &[
                "explorer",
                "launchd",
                "finder",
                "systemd",
                "gnome-shell",
                "kwin",
                "sway",
                "i3",
                "plasmashell",
                "xfce4-session",
            ];

            if TERMINAL_PARENTS.iter().any(|t| p.contains(t)) {
                return AiTarget::ClaudeCodeCli;
            }

            if GUI_PARENTS.iter().any(|g| p.contains(g)) {
                return AiTarget::ClaudeDesktop;
            }
        }

        // ── Criterion 3: Conservative default ────────────────────────────────
        // If we cannot determine, default to CLI. Starting a proxy unnecessarily
        // is safer than trying to CDP-inject a non-Electron process (which would crash).
        debug!(
            "Could not classify claude process via path or parent. Defaulting to ClaudeCodeCli."
        );
        AiTarget::ClaudeCodeCli
    }

    /// Launch an executable with extra arguments.
    fn launch_with_args(&self, exe_path: &str, args: &[&str]) -> bool {
        #[cfg(target_os = "macos")]
        {
            let result = if exe_path.ends_with(".app") {
                let mut cmd = Command::new("open");
                cmd.arg("-n").arg("-a").arg(exe_path).arg("--args");
                for a in args {
                    cmd.arg(a);
                }
                cmd.spawn()
            } else {
                let mut cmd = Command::new(exe_path);
                for a in args {
                    cmd.arg(a);
                }
                cmd.spawn()
            };
            match result {
                Ok(_) => {
                    info!("App relaunched (macOS): {}", exe_path);
                    true
                }
                Err(e) => {
                    error!("Failed to relaunch {}: {}", exe_path, e);
                    false
                }
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            let mut cmd = Command::new(exe_path);
            for a in args {
                cmd.arg(a);
            }
            match cmd.spawn() {
                Ok(_) => {
                    info!("App relaunched: {}", exe_path);
                    true
                }
                Err(e) => {
                    error!("Failed to relaunch {}: {}", exe_path, e);
                    false
                }
            }
        }
    }

    /// Get the parent process name for a given process.
    fn get_parent_name(&self, process: &sysinfo::Process) -> Option<String> {
        let parent_pid = process.parent()?;
        let parent = self.system.process(parent_pid)?;
        Some(parent.name().to_string_lossy().to_lowercase())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Backwards-compat alias (used in the existing cdp_client / main flows)
// ─────────────────────────────────────────────────────────────────────────────

/// Alias kept for backwards compatibility with code that references `ChatGPTProcess`.
pub type ChatGPTProcess = DetectedAiProcess;

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detector_creation() {
        let detector = ProcessDetector::new();
        assert!(detector.system.processes().len() > 0);
    }

    #[test]
    fn test_classify_claude_desktop_by_path() {
        let exe = Some("/Applications/Claude.app/Contents/MacOS/Claude".to_string());
        let result = ProcessDetector::classify_claude_process(&exe, &None);
        assert_eq!(result, AiTarget::ClaudeDesktop);
    }

    #[test]
    fn test_classify_claude_desktop_windows_path() {
        let exe =
            Some(r"C:\Users\user\AppData\Local\Programs\claude-desktop\Claude.exe".to_string());
        let result = ProcessDetector::classify_claude_process(&exe, &None);
        assert_eq!(result, AiTarget::ClaudeDesktop);
    }

    #[test]
    fn test_classify_claude_code_by_path() {
        let exe = Some("/home/user/.local/bin/claude".to_string());
        let result = ProcessDetector::classify_claude_process(&exe, &None);
        assert_eq!(result, AiTarget::ClaudeCodeCli);
    }

    #[test]
    fn test_classify_claude_code_windows_path() {
        let exe = Some(r"C:\Users\user\.local\bin\claude.exe".to_string());
        let result = ProcessDetector::classify_claude_process(&exe, &None);
        assert_eq!(result, AiTarget::ClaudeCodeCli);
    }

    #[test]
    fn test_classify_claude_code_by_terminal_parent() {
        let result = ProcessDetector::classify_claude_process(&None, &Some("zsh".to_string()));
        assert_eq!(result, AiTarget::ClaudeCodeCli);
    }

    #[test]
    fn test_classify_claude_desktop_by_gui_parent() {
        let result = ProcessDetector::classify_claude_process(&None, &Some("launchd".to_string()));
        assert_eq!(result, AiTarget::ClaudeDesktop);
    }

    #[test]
    fn test_classify_unknown_defaults_to_cli() {
        // When we can't determine, default to CLI (safer)
        let result = ProcessDetector::classify_claude_process(&None, &None);
        assert_eq!(result, AiTarget::ClaudeCodeCli);
    }

    #[test]
    fn test_ai_target_cdp_ports() {
        assert_eq!(AiTarget::ChatGptDesktop.cdp_port(), Some(9222));
        assert_eq!(AiTarget::ClaudeDesktop.cdp_port(), Some(9223));
        assert_eq!(AiTarget::ClaudeCodeCli.cdp_port(), None);
        assert_eq!(AiTarget::CursorIde.cdp_port(), None);
        assert_eq!(AiTarget::WindsurfIde.cdp_port(), None);
    }

    #[test]
    fn test_ai_target_electron_check() {
        assert!(AiTarget::ChatGptDesktop.is_electron());
        assert!(AiTarget::ClaudeDesktop.is_electron());
        assert!(!AiTarget::ClaudeCodeCli.is_electron());
        assert!(!AiTarget::CursorIde.is_electron());
        assert!(!AiTarget::WindsurfIde.is_electron());
    }

    #[test]
    fn test_ai_target_uses_proxy() {
        assert!(!AiTarget::ChatGptDesktop.uses_proxy());
        assert!(!AiTarget::ClaudeDesktop.uses_proxy());
        assert!(AiTarget::ClaudeCodeCli.uses_proxy());
        assert!(AiTarget::CursorIde.uses_proxy());
        assert!(AiTarget::WindsurfIde.uses_proxy());
        assert!(AiTarget::VsCodeWithAi.uses_proxy());
        assert!(AiTarget::AntigravityIde.uses_proxy());
    }

    #[test]
    fn test_ai_target_display_names() {
        assert_eq!(AiTarget::CursorIde.display_name(), "Cursor IDE");
        assert_eq!(AiTarget::WindsurfIde.display_name(), "Windsurf IDE");
        assert_eq!(AiTarget::AntigravityIde.display_name(), "Antigravity IDE");
    }
}
