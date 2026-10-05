import { paths } from './paths.mjs';

export function desktopProfile(env = process.env) {
  const locations = paths(env);
  return {
    name: 'OpenADE',
    executable: locations.executable,
    args: [`--user-data-dir=${locations.profile}`, '--ozone-platform=x11'],
    dataDir: locations.data,
    env: {
      // Run extracted Electron directly: no FUSE, and electron-updater stays inactive.
      APPIMAGE: undefined,
      APPDIR: undefined,
      ELECTRON_RUN_AS_NODE: undefined,
      OPENADE_LINUX_OZONE_PLATFORM: 'x11',
      OPENADE_ENABLE_COMPANION: '0',
      VITE_OPENADE_ENABLE_COMPANION: '0',
      OPENADE_SMOKE_TEST: undefined,
    },
  };
}
