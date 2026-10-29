# Software for this think_ai checkout

## Browser development

- VS Code and Edge or Chrome.
- Node.js/npm: the installed Node 24.16.0 ran this checkout's tests and servers. [Official Node download](https://nodejs.org/en/download).
- PostgreSQL server: the current local database connection and learner account were verified. pgAdmin is optional.
- [Git for Windows](https://git-scm.com/install/windows) for cloning, pulling and merging team changes.
- Install the repository's npm dependencies in backend and mobile. This project currently uses Expo 51.0.39, React Native 0.74.5 and Prisma 6.19.3; a framework/Prisma major upgrade is a separate change.

## Android and iOS

Android builds need Android Studio, the SDK platform/build tools matching this project's generated build, platform tools/adb, an emulator or physical device, and JDK 17. The existing SDK files found elsewhere on this computer do not establish a configured or verified native build for this checkout. [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment/), [Android Studio](https://developer.android.com/studio).

The react-native-fs download feature requires a native/development build. Expo Go does not contain that custom native module. [Expo environment/development builds](https://docs.expo.dev/get-started/set-up-your-environment/).

Local iOS builds require a compatible macOS/Xcode/CocoaPods environment. Native device tests remain pending.

## Code execution and certificates

The prepared local QEMU/Ubuntu VM contains Docker and Judge0. Its private disk/configuration stay outside the repository and OneDrive; the ignored backend/.local/judge0-runtime.json points to it. On another machine, prepare an approved Judge0 service/runtime and configure its URL/auth/language IDs. Installing editor extensions does not provide this service.

Real certificate upload/email additionally requires approved S3/IAM/CORS, SendGrid sender/key, staging learner/DB and client branding. See PATAN_ITEMS_1_2_STATUS.md.

## Optional VS Code extensions

| Extension | Purpose |
| --- | --- |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | Workspace lint diagnostics |
| [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | Code formatting |
| [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) | Prisma schema editing; use support compatible with the repository's Prisma version |
| [React Native Tools](https://marketplace.visualstudio.com/items?itemName=msjsdiag.vscode-react-native) | React Native debugging tools |

These extensions help editing/debugging. The app runs through Node, the database, Expo and configured services.
