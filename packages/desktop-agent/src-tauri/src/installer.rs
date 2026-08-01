/// installer.rs -- Shell Environment Injection for Claude Code CLI governance
///
/// Strategy: inject proxy env vars via the user's shell profile instead of
/// renaming binaries. This is robust against Claude Code auto-updates,
/// works with symlinks, and covers all invocation methods (CLI, VS Code, etc.).
///
///   Files written:
///     ~/.config/onefend/env.sh       -- shell snippet (sourced by profile)
///     ~/.config/onefend/ca.crt       -- Onefend CA cert
///     ~/.bashrc / ~/.zshrc           -- one-line source added (idempotent)
///
///   On Windows:
///     %APPDATA%\Onefend\env.cmd      -- cmd snippet
///     %APPDATA%\Onefend\ca.crt       -- Onefend CA cert
///     Registry HKCU\Environment      -- HTTPS_PROXY + NODE_EXTRA_CA_CERTS
///
///   When the user opens a new terminal:
///     shell sources env.sh -> HTTPS_PROXY + NODE_EXTRA_CA_CERTS are set
///     -> claude (any version) routes API traffic through proxy.rs
///
/// Fail-open: the env snippet checks if the proxy port is reachable before
/// setting the env vars. If the agent is not running, traffic goes direct.
///
/// Idempotent: calling install() multiple times is safe.
use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::{debug, info, warn};

use crate::proxy::PROXY_PORT;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Marker embedded in shell profile lines so we can find/remove our additions.
const PROFILE_MARKER: &str = "# onefend-proxy";

/// Marker embedded in the env snippet file itself.
const ENV_SNIPPET_MARKER: &str = "# Onefend-Env-v2";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

pub struct EnvInstaller;

impl EnvInstaller {
    /// Full install: write CA cert, write env snippet, patch shell profiles.
    ///
    /// Returns `Ok(true)` if any files were written or profiles patched,
    /// `Ok(false)` if everything was already up-to-date.
    pub fn install(ca_cert_pem: &str) -> Result<bool> {
        let mut changed = false;

        // 1. Write CA cert
        let ca_path = Self::save_ca_cert(ca_cert_pem)?;
        debug!("[Installer] CA cert at {:?}", ca_path);

        // 2. Write env snippet
        let snippet_path = Self::env_snippet_path();
        let snippet_content = Self::build_env_snippet(&ca_path);

        if let Some(parent) = snippet_path.parent() {
            fs::create_dir_all(parent).context("Failed to create onefend config dir")?;
        }

        let existing = fs::read_to_string(&snippet_path).unwrap_or_default();
        if existing != snippet_content {
            fs::write(&snippet_path, &snippet_content)
                .context("Failed to write env snippet")?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = fs::metadata(&snippet_path)?.permissions();
                perms.set_mode(0o644);
                fs::set_permissions(&snippet_path, perms)?;
            }
            info!("[Installer] Env snippet written to {:?}", snippet_path);
            changed = true;
        }

        // 3. Patch shell profiles (Unix) or registry (Windows)
        #[cfg(not(target_os = "windows"))]
        {
            let profiles = Self::shell_profile_paths();
            for profile in &profiles {
                if Self::patch_shell_profile(profile, &snippet_path)? {
                    changed = true;
                }
            }
        }

        #[cfg(target_os = "windows")]
        {
            if Self::set_windows_env_vars(&ca_path)? {
                changed = true;
            }
        }

        // 4. Patch .desktop files (Linux) so GUI-launched IDEs also use the proxy
        #[cfg(target_os = "linux")]
        {
            if Self::patch_desktop_files(&ca_path)? {
                changed = true;
            }
        }

        if changed {
            info!("[Installer] Environment injection installed successfully");
        } else {
            debug!("[Installer] Environment injection already up-to-date");
        }

        Ok(changed)
    }

    /// Remove all traces: delete env snippet, remove source lines from profiles.
    pub fn uninstall() -> Result<()> {
        // Remove env snippet
        let snippet_path = Self::env_snippet_path();
        if snippet_path.exists() {
            fs::remove_file(&snippet_path)
                .context("Failed to remove env snippet")?;
            info!("[Installer] Removed {:?}", snippet_path);
        }

        // Remove source lines from shell profiles
        #[cfg(not(target_os = "windows"))]
        {
            let profiles = Self::shell_profile_paths();
            for profile in &profiles {
                Self::unpatch_shell_profile(profile)?;
            }
        }

        #[cfg(target_os = "windows")]
        {
            Self::remove_windows_env_vars()?;
        }

        #[cfg(target_os = "linux")]
        {
            Self::unpatch_desktop_files()?;
        }

        info!("[Installer] Environment injection uninstalled");
        Ok(())
    }

    /// Check if the env injection is installed.
    pub fn is_installed() -> bool {
        let snippet_path = Self::env_snippet_path();
        if !snippet_path.exists() {
            return false;
        }
        match fs::read_to_string(&snippet_path) {
            Ok(content) => content.contains(ENV_SNIPPET_MARKER),
            Err(_) => false,
        }
    }

    /// Ensure env injection is current. Re-writes snippet if CA cert changed.
    /// Returns `Ok(true)` if anything was updated.
    pub fn update_if_needed(ca_cert_pem: &str) -> Result<bool> {
        if !Self::is_installed() {
            return Self::install(ca_cert_pem);
        }
        // Re-write CA cert (repairs stale/corrupted files)
        let ca_path = Self::save_ca_cert(ca_cert_pem)?;
        let snippet_path = Self::env_snippet_path();
        let expected = Self::build_env_snippet(&ca_path);
        let current = fs::read_to_string(&snippet_path).unwrap_or_default();
        if current != expected {
            fs::write(&snippet_path, &expected)?;
            info!("[Installer] Env snippet updated");
            return Ok(true);
        }
        Ok(false)
    }

    // -----------------------------------------------------------------------
    // CA cert (unchanged from previous version)
    // -----------------------------------------------------------------------

    pub fn ca_cert_path() -> PathBuf {
        #[cfg(test)]
        {
            std::env::temp_dir().join("onefend_test_ca.crt")
        }

        #[cfg(not(test))]
        {
            Self::config_dir().join("ca.crt")
        }
    }

    pub fn save_ca_cert(pem: &str) -> Result<PathBuf> {
        let path = Self::ca_cert_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).context("Failed to create config directory")?;
        }
        fs::write(&path, pem.as_bytes())
            .context(format!("Failed to write CA cert to {:?}", path))?;
        Ok(path)
    }

    // -----------------------------------------------------------------------
    // Paths
    // -----------------------------------------------------------------------

    fn config_dir() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            std::env::var("APPDATA")
                .map(PathBuf::from)
                .unwrap_or_else(|_| std::env::temp_dir())
                .join("Onefend")
        }

        #[cfg(not(target_os = "windows"))]
        {
            std::env::var("HOME")
                .map(PathBuf::from)
                .unwrap_or_else(|_| std::env::temp_dir())
                .join(".config")
                .join("onefend")
        }
    }

    fn env_snippet_path() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            Self::config_dir().join("env.cmd")
        }

        #[cfg(not(target_os = "windows"))]
        {
            Self::config_dir().join("env.sh")
        }
    }

    #[cfg(not(target_os = "windows"))]
    fn shell_profile_paths() -> Vec<PathBuf> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let mut profiles = Vec::new();

        // Add existing profiles (don't create new ones the user doesn't have)
        let candidates = [
            format!("{}/.bashrc", home),
            format!("{}/.zshrc", home),
            format!("{}/.profile", home),
        ];

        for path in &candidates {
            let pb = PathBuf::from(path);
            if pb.exists() {
                profiles.push(pb);
            }
        }

        // If no profile exists at all, default to .bashrc
        if profiles.is_empty() {
            profiles.push(PathBuf::from(format!("{}/.bashrc", home)));
        }

        profiles
    }

    // -----------------------------------------------------------------------
    // Env snippet builders
    // -----------------------------------------------------------------------

    fn build_env_snippet(ca_path: &Path) -> String {
        let ca_str = ca_path.to_string_lossy();

        #[cfg(target_os = "windows")]
        {
            format!(
                "@echo off\r\n\
                 {marker}\r\n\
                 REM Onefend Desktop Agent - proxy env vars for AI governance\r\n\
                 REM This file is managed by Onefend. Do not edit manually.\r\n\
                 \r\n\
                 netstat -an 2>nul | find \"127.0.0.1:{port}\" >nul\r\n\
                 if %errorlevel% equ 0 (\r\n\
                     set \"HTTPS_PROXY=http://127.0.0.1:{port}\"\r\n\
                     set \"NODE_EXTRA_CA_CERTS={ca}\"\r\n\
                 )\r\n",
                marker = ENV_SNIPPET_MARKER,
                port = PROXY_PORT,
                ca = ca_str,
            )
        }

        #[cfg(not(target_os = "windows"))]
        {
            // Global env export with fail-open check.
            //
            // Sets HTTPS_PROXY and NODE_EXTRA_CA_CERTS globally so ALL AI tools
            // launched from this shell session route through the Onefend proxy
            // (Claude Code, VS Code extensions, Copilot, Cursor, Windsurf, etc.).
            //
            // IMPORTANT: We only set HTTPS_PROXY, NOT HTTP_PROXY.
            // Our proxy only handles CONNECT tunnels (HTTPS). If HTTP_PROXY is
            // set, apps send plain HTTP requests to the proxy which it can't
            // parse (expects "CONNECT host:port" but gets "GET / HTTP/1.1").
            //
            // Fail-open: if the proxy port is not reachable (agent not running),
            // the env vars are NOT set, so tools connect directly.
            //
            // The check runs at shell startup time. If the agent starts after
            // the terminal opens, the user needs to open a new terminal or
            // run `source ~/.config/onefend/env.sh` manually.
            format!(
                "{marker}\n\
                 # Onefend Desktop Agent - AI governance proxy (global)\n\
                 # This file is managed by Onefend. Do not edit manually.\n\
                 #\n\
                 # Routes HTTPS traffic from AI tools through the Onefend proxy.\n\
                 # Only HTTPS_PROXY is set (proxy only handles CONNECT tunnels).\n\
                 # Fail-open: if the agent is not running, env vars are not set.\n\
                 if bash -c '</dev/tcp/127.0.0.1/{port}' 2>/dev/null; then\n\
                 \texport HTTPS_PROXY=\"http://127.0.0.1:{port}\"\n\
                 \texport NODE_EXTRA_CA_CERTS=\"{ca}\"\n\
                 fi\n",
                marker = ENV_SNIPPET_MARKER,
                port = PROXY_PORT,
                ca = ca_str,
            )
        }
    }

    // -----------------------------------------------------------------------
    // Shell profile patching (Unix)
    // -----------------------------------------------------------------------

    #[cfg(not(target_os = "windows"))]
    fn patch_shell_profile(profile: &Path, snippet_path: &Path) -> Result<bool> {
        let source_line = format!(
            "[ -f \"{}\" ] && . \"{}\" {}\n",
            snippet_path.to_string_lossy(),
            snippet_path.to_string_lossy(),
            PROFILE_MARKER,
        );

        // Read existing content (or create the file)
        let existing = fs::read_to_string(profile).unwrap_or_default();

        // Already patched?
        if existing.contains(PROFILE_MARKER) {
            debug!("[Installer] {:?} already patched", profile);
            return Ok(false);
        }

        // Append the source line
        let mut content = existing;
        if !content.ends_with('\n') && !content.is_empty() {
            content.push('\n');
        }
        content.push_str(&source_line);

        fs::write(profile, &content)
            .context(format!("Failed to patch {:?}", profile))?;
        info!("[Installer] Patched {:?}", profile);
        Ok(true)
    }

    #[cfg(not(target_os = "windows"))]
    fn unpatch_shell_profile(profile: &Path) -> Result<()> {
        if !profile.exists() {
            return Ok(());
        }
        let content = fs::read_to_string(profile)?;
        if !content.contains(PROFILE_MARKER) {
            return Ok(());
        }
        let cleaned: String = content
            .lines()
            .filter(|line| !line.contains(PROFILE_MARKER))
            .collect::<Vec<_>>()
            .join("\n");
        // Preserve trailing newline
        let cleaned = if cleaned.is_empty() {
            cleaned
        } else {
            format!("{}\n", cleaned)
        };
        fs::write(profile, &cleaned)?;
        info!("[Installer] Removed onefend line from {:?}", profile);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Windows registry (user-level env vars)
    // -----------------------------------------------------------------------

    #[cfg(target_os = "windows")]
    fn set_windows_env_vars(ca_path: &Path) -> Result<bool> {
        use std::process::Command;
        let ca_str = ca_path.to_string_lossy();

        // Use setx to set user-level environment variables
        // Only HTTPS_PROXY -- proxy handles CONNECT tunnels only, not plain HTTP
        let vars = [
            ("HTTPS_PROXY", format!("http://127.0.0.1:{}", PROXY_PORT)),
            ("NODE_EXTRA_CA_CERTS", ca_str.to_string()),
        ];

        let mut changed = false;
        for (name, value) in &vars {
            let status = Command::new("setx")
                .args([*name, value])
                .output()
                .context(format!("Failed to run setx for {}", name))?;
            if status.status.success() {
                info!("[Installer] Set user env var: {}={}", name, value);
                changed = true;
            } else {
                warn!(
                    "[Installer] setx failed for {}: {}",
                    name,
                    String::from_utf8_lossy(&status.stderr)
                );
            }
        }
        Ok(changed)
    }

    #[cfg(target_os = "windows")]
    fn remove_windows_env_vars() -> Result<()> {
        use std::process::Command;
        for name in &["HTTPS_PROXY", "NODE_EXTRA_CA_CERTS"] {
            // setx with empty string removes the var
            let _ = Command::new("setx").args([*name, ""]).output();
            info!("[Installer] Removed user env var: {}", name);
        }
        Ok(())
    }

    // -----------------------------------------------------------------------
    // .desktop file patching (Linux GUI launches)
    // -----------------------------------------------------------------------

    /// Marker comment embedded in patched .desktop files.
    const DESKTOP_MARKER: &'static str = "# onefend-patched";

    /// Known IDE .desktop filenames to patch.
    const IDE_DESKTOP_FILES: &'static [&'static str] = &[
        "code.desktop",             // VS Code
        "code-insiders.desktop",    // VS Code Insiders
        "cursor.desktop",           // Cursor IDE
        "windsurf.desktop",         // Windsurf IDE
    ];

    /// Patch .desktop files so IDEs launched from the GUI also route through the proxy.
    ///
    /// Strategy:
    ///   1. Write a launcher script (~/.config/onefend/launch-ide.sh) that checks
    ///      if the proxy is running before setting env vars (fail-open).
    ///   2. Copy the system .desktop file to ~/.local/share/applications/
    ///      and change Exec= to use the launcher script as a wrapper.
    ///
    /// Fail-open: if the agent is not running, the IDE launches normally without proxy.
    #[cfg(target_os = "linux")]
    fn patch_desktop_files(ca_path: &Path) -> Result<bool> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let user_apps_dir = PathBuf::from(&home).join(".local/share/applications");
        let system_apps_dir = PathBuf::from("/usr/share/applications");
        let ca_str = ca_path.to_string_lossy();

        // Step 1: Write the launcher script (fail-open wrapper)
        let launcher_path = Self::config_dir().join("launch-ide.sh");
        let launcher_content = format!(
            "#!/bin/bash\n\
             # Onefend Desktop Agent - IDE launcher with fail-open proxy\n\
             # If the proxy is running, route traffic through it.\n\
             # If not, launch the IDE normally (fail-open).\n\
             if bash -c '</dev/tcp/127.0.0.1/{port}' 2>/dev/null; then\n\
             \texport HTTPS_PROXY=\"http://127.0.0.1:{port}\"\n\
             \texport NODE_EXTRA_CA_CERTS=\"{ca}\"\n\
             fi\n\
             exec \"$@\"\n",
            port = PROXY_PORT,
            ca = ca_str,
        );

        let launcher_needs_update = fs::read_to_string(&launcher_path)
            .map(|existing| existing != launcher_content)
            .unwrap_or(true);

        if launcher_needs_update {
            fs::write(&launcher_path, &launcher_content)
                .context("Failed to write launcher script")?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&launcher_path, fs::Permissions::from_mode(0o755));
            }
            debug!("[Installer] Launcher script written to {:?}", launcher_path);
        }

        let launcher_str = launcher_path.to_string_lossy();

        // Step 2: Patch .desktop files to use the launcher
        let mut changed = false;

        for filename in Self::IDE_DESKTOP_FILES {
            let system_path = system_apps_dir.join(filename);
            let user_path = user_apps_dir.join(filename);

            // Find the source: prefer existing user override, else system
            let source_path = if user_path.exists() && !Self::is_our_desktop_patch(&user_path) {
                // User has their own custom .desktop -- don't overwrite
                &user_path
            } else if user_path.exists() && Self::is_our_desktop_patch(&user_path) {
                // Our previous patch -- re-read from system to get a clean base
                if system_path.exists() { &system_path } else { continue; }
            } else if system_path.exists() {
                &system_path
            } else {
                continue; // IDE not installed
            };

            let content = match fs::read_to_string(source_path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            // Already patched with current launcher?
            if content.contains(&*launcher_str) && content.contains(Self::DESKTOP_MARKER) {
                debug!("[Installer] {:?} already patched and up-to-date", filename);
                continue;
            }

            // Patch Exec= lines: wrap the command with our launcher script
            // Exec=/usr/share/code/code %F -> Exec=/home/user/.config/onefend/launch-ide.sh /usr/share/code/code %F
            let patched: String = content
                .lines()
                .map(|line| {
                    if line.starts_with("Exec=") {
                        // Extract the original command (strip any existing onefend wrapper)
                        let original_cmd = if line.contains("launch-ide.sh") {
                            // Already wrapped -- extract the original command after the script path
                            line.splitn(2, "launch-ide.sh ")
                                .nth(1)
                                .unwrap_or(&line[5..])
                        } else {
                            &line[5..]
                        };
                        format!("Exec={} {}", launcher_str, original_cmd)
                    } else {
                        line.to_string()
                    }
                })
                .collect::<Vec<_>>()
                .join("\n");

            // Add marker comment at end
            let patched = if patched.contains(Self::DESKTOP_MARKER) {
                patched
            } else {
                format!("{}\n{}", patched, Self::DESKTOP_MARKER)
            };

            // Write to user apps dir (override, no sudo)
            fs::create_dir_all(&user_apps_dir)
                .context("Failed to create user applications directory")?;
            fs::write(&user_path, &patched)
                .context(format!("Failed to write patched {:?}", user_path))?;
            info!("[Installer] Patched .desktop file: {:?}", user_path);
            changed = true;
        }

        Ok(changed)
    }

    /// Check if a .desktop file was patched by us.
    #[cfg(target_os = "linux")]
    fn is_our_desktop_patch(path: &Path) -> bool {
        fs::read_to_string(path)
            .map(|c| c.contains(Self::DESKTOP_MARKER))
            .unwrap_or(false)
    }

    /// Remove patched .desktop overrides from the user's applications directory.
    #[cfg(target_os = "linux")]
    fn unpatch_desktop_files() -> Result<()> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let user_apps_dir = PathBuf::from(&home).join(".local/share/applications");

        for filename in Self::IDE_DESKTOP_FILES {
            let user_path = user_apps_dir.join(filename);
            if !user_path.exists() {
                continue;
            }
            let content = fs::read_to_string(&user_path).unwrap_or_default();
            if content.contains(Self::DESKTOP_MARKER) {
                fs::remove_file(&user_path)
                    .context(format!("Failed to remove patched {:?}", user_path))?;
                info!("[Installer] Removed patched .desktop file: {:?}", user_path);
            }
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Legacy cleanup: remove old wrapper-based installations
// ---------------------------------------------------------------------------

/// Remove any old-style wrapper scripts that renamed binaries to .real.
/// This cleans up the mess from the previous installer approach.
pub fn cleanup_legacy_wrappers() {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());

    // Known paths where the old installer might have created wrappers
    let candidates = [
        format!("{}/.local/bin/claude", home),
        format!("{}/.nvm/versions/node/current/bin/claude", home),
        format!("{}/.npm-global/bin/claude", home),
        "/usr/local/bin/claude".to_string(),
    ];

    for path_str in &candidates {
        let wrapper_path = PathBuf::from(path_str);
        let real_path = PathBuf::from(format!("{}.real", path_str));

        // Check if .real exists -- that means old installer was here
        if real_path.exists() {
            // Check if the wrapper file is ours (contains old marker)
            let is_our_wrapper = fs::read(&wrapper_path)
                .map(|bytes| {
                    let head = String::from_utf8_lossy(&bytes[..bytes.len().min(256)]);
                    head.contains("Onefend-Wrapper-v1")
                })
                .unwrap_or(false);

            if is_our_wrapper {
                // Remove wrapper, restore .real
                if let Err(e) = fs::remove_file(&wrapper_path) {
                    warn!("[Cleanup] Failed to remove wrapper {:?}: {}", wrapper_path, e);
                    continue;
                }
                if let Err(e) = fs::rename(&real_path, &wrapper_path) {
                    warn!("[Cleanup] Failed to restore {:?}: {}", real_path, e);
                } else {
                    info!("[Cleanup] Restored {:?} from old wrapper", wrapper_path);
                }
            } else if !wrapper_path.exists() {
                // wrapper_path doesn't exist (broken symlink?) but .real does
                // Just remove the orphaned .real
                if let Err(e) = fs::remove_file(&real_path) {
                    warn!("[Cleanup] Failed to remove orphaned {:?}: {}", real_path, e);
                } else {
                    info!("[Cleanup] Removed orphaned {:?}", real_path);
                }
            }
        }
    }

    // Also check for wrapped node binary (critical damage from old installer)
    let node_candidates: Vec<String> = {
        #[cfg(not(target_os = "windows"))]
        {
            // Check nvm paths
            let mut paths = Vec::new();
            if let Ok(entries) = std::fs::read_dir(format!("{}/.nvm/versions/node/", home)) {
                for entry in entries.flatten() {
                    let node_path = entry.path().join("bin/node");
                    paths.push(node_path.to_string_lossy().to_string());
                }
            }
            paths.push("/usr/local/bin/node".to_string());
            paths
        }
        #[cfg(target_os = "windows")]
        {
            Vec::new()
        }
    };

    for path_str in &node_candidates {
        let node_path = PathBuf::from(path_str);
        let real_path = PathBuf::from(format!("{}.real", path_str));

        if real_path.exists() {
            let is_our_wrapper = fs::read(&node_path)
                .map(|bytes| {
                    let head = String::from_utf8_lossy(&bytes[..bytes.len().min(512)]);
                    head.contains("Onefend-Wrapper-v1")
                })
                .unwrap_or(false);

            if is_our_wrapper {
                warn!(
                    "[Cleanup] Found wrapped node binary at {:?}! Restoring...",
                    node_path
                );
                if let Err(e) = fs::remove_file(&node_path) {
                    warn!("[Cleanup] Failed to remove node wrapper: {}", e);
                    continue;
                }
                if let Err(e) = fs::rename(&real_path, &node_path) {
                    warn!("[Cleanup] CRITICAL: Failed to restore node: {}", e);
                } else {
                    info!("[Cleanup] Restored node binary at {:?}", node_path);
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_env_snippet_content() {
        let ca = Path::new("/home/user/.config/onefend/ca.crt");
        let snippet = EnvInstaller::build_env_snippet(ca);

        assert!(snippet.contains(ENV_SNIPPET_MARKER));
        assert!(snippet.contains(&PROXY_PORT.to_string()));
        assert!(snippet.contains("HTTPS_PROXY"));
        // HTTP_PROXY must NOT be set (proxy only handles CONNECT tunnels)
        assert!(!snippet.contains("HTTP_PROXY"));
        assert!(snippet.contains("NODE_EXTRA_CA_CERTS"));
        assert!(snippet.contains("/home/user/.config/onefend/ca.crt"));
    }

    #[test]
    fn test_env_snippet_fail_open() {
        let ca = Path::new("/tmp/ca.crt");
        let snippet = EnvInstaller::build_env_snippet(ca);

        // Must contain the fail-open check
        assert!(snippet.contains("/dev/tcp/127.0.0.1/"));
        assert!(snippet.contains("if bash"));
    }

    #[test]
    fn test_env_snippet_is_global_export() {
        let ca = Path::new("/tmp/ca.crt");
        let snippet = EnvInstaller::build_env_snippet(ca);

        // Must use global export (not a function wrapper)
        assert!(snippet.contains("export HTTPS_PROXY="));
        // HTTP_PROXY must NOT be set (proxy only handles CONNECT tunnels)
        assert!(!snippet.contains("export HTTP_PROXY="));
        assert!(snippet.contains("export NODE_EXTRA_CA_CERTS="));
        // Must NOT be a function wrapper (old behavior)
        assert!(!snippet.contains("claude()"));
        assert!(!snippet.contains("command claude"));
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_patch_shell_profile_idempotent() {
        let dir = tempdir().unwrap();
        let profile = dir.path().join(".bashrc");
        let snippet = dir.path().join("env.sh");

        // Create initial profile
        fs::write(&profile, "# my bashrc\n").unwrap();
        fs::write(&snippet, "# snippet\n").unwrap();

        // First patch
        let first = EnvInstaller::patch_shell_profile(&profile, &snippet).unwrap();
        assert!(first, "First patch should return true");

        let content = fs::read_to_string(&profile).unwrap();
        assert!(content.contains(PROFILE_MARKER));
        let marker_count = content.matches(PROFILE_MARKER).count();
        assert_eq!(marker_count, 1, "Should have exactly one marker");

        // Second patch (idempotent)
        let second = EnvInstaller::patch_shell_profile(&profile, &snippet).unwrap();
        assert!(!second, "Second patch should return false");

        let content2 = fs::read_to_string(&profile).unwrap();
        let marker_count2 = content2.matches(PROFILE_MARKER).count();
        assert_eq!(marker_count2, 1, "Still exactly one marker");
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_unpatch_removes_source_line() {
        let dir = tempdir().unwrap();
        let profile = dir.path().join(".bashrc");
        let snippet = dir.path().join("env.sh");

        fs::write(&profile, "# my bashrc\nalias ll='ls -la'\n").unwrap();
        fs::write(&snippet, "# snippet\n").unwrap();

        EnvInstaller::patch_shell_profile(&profile, &snippet).unwrap();
        EnvInstaller::unpatch_shell_profile(&profile).unwrap();

        let content = fs::read_to_string(&profile).unwrap();
        assert!(!content.contains(PROFILE_MARKER));
        assert!(content.contains("alias ll"), "Original content preserved");
    }

    #[test]
    fn test_is_installed_checks_snippet_marker() {
        // Verify the function checks for the marker, not just file existence
        let dir = tempdir().unwrap();
        let path = dir.path().join("env.sh");
        fs::write(&path, "# random file\n").unwrap();
        let content = fs::read_to_string(&path).unwrap();
        assert!(!content.contains(ENV_SNIPPET_MARKER));
    }

    #[test]
    fn test_ca_cert_save_and_path() {
        let pem = "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n";
        let path = EnvInstaller::save_ca_cert(pem).unwrap();
        assert!(path.exists());
        let content = fs::read_to_string(&path).unwrap();
        assert_eq!(content, pem);
    }
}
