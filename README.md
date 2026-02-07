# The Chief's Log: TSSA 2nd Class Simulator

A high-fidelity, offline-capable Progressive Web App (PWA) designed for Power Engineers studying for the TSSA 2nd Class license.

## Features
- **Rankine Cycle Diagnostics**: Dynamic calculations for thermal efficiency.
- **ASME Code Lookup**: Real-world regulatory citation logic.
- **PWA Ready**: Works fully offline on Pixel/Android devices.
- **Diagnostic Tools**: Interactive solvers for pumps, turbines, metallurgy, and electrical systems.

## Deployment
This is a static PWA. You can host it for free on **GitHub Pages**:
1. Go to Repository Settings.
2. Select **Pages**.
3. Set the branch to `main` and folder to `/root`.

## Technical Specs
- **Engine**: Pure TypeScript / React.
- **Styling**: Tailwind CSS via CDN (cached by SW).
- **Persistence**: LocalStorage kernel.
- **Authentication**: Zero-knowledge / Offline.