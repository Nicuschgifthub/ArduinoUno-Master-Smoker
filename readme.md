# ArduinoUno Master Smoker Config Software

This is the repo for all the software used to configure the AUMS.

# Using Macos

## 1. Prerequisites & Installation

To use this code, you need a modern development environment. I recommend **Visual Studio Code (VSC)** with the **PlatformIO** extension.

### Step A: Install VS Code
1. Download and install [Visual Studio Code](https://code.visualstudio.com/Download).

### Step B: Install PlatformIO
1. Open VS Code.
2. Click on the **Extensions** icon on the left sidebar (looks like four squares).
3. Search for **"PlatformIO IDE"** and click **Install**.
4. Wait for the installation to finish (it may ask to restart VS Code).

---

## 2. Setting Up the Project
1. **Download the Project**:
   * Click on "Code" then "Download ZIP".
   * Extract the folder to your computer.
2. **Open in VS Code**:
   * Open VS Code.
   * Go to **File > Open Folder...** and select the Windows folder from your extracted zip.
3. **Locate the Code**:
   * In the left-hand explorer, open the `src` folder and select `main.cpp`.
   * This is where you customize your `myPins`, `preSequence`, and `mainSequence`.
4. **Check Settings**:
   * Ensure the `platformio.ini` file has the correct `board` setting (e.g., `board = uno`).
   * **Note:** The Serial Monitor speed is set to **57600** baud.

## 3. Uploading to the ArduinoUno

1. **Connect your ArduinoUno**:
   * Plug your Arduino into your PC via USB. Windows should recognize it automatically.
2. **Upload your new code**:
   * Click on the **PlatformIO** extension icon on the left sidebar (the ant icon).
   * Go to **Project Tasks > Uno > General** and click **Upload and Monitor**.
   * PlatformIO will compile the code, flash it to your board, and open the serial terminal.

# Using Windows with Web View

## 1. Quick Setup Guide

1.  **Download**: Get the latest `.exe` from the GitHub Releases page.
2.  **Extract**: Run the file to unpack the necessary web server and driver components.
3.  **Launch**: Open `ArduinoUnoMasterSmoker.exe`. This will launch a local web server and open the interface in your browser.
4.  **Connect**: Ensure your Arduino Uno is plugged in via USB before you start configuring.

## 2. Browser Interface Features

The web view provides a user-friendly way to manage your smoker settings without touching raw code:

*   **Configure the Sequence**: Use the intuitive "Add to End" buttons and toggle switches to define exactly how your Fan and Smoke components behave.
*   **Summary**: The right-hand column (Pre-Sequence and Main Sequence) provides a summary of your logic.
*   **Save & Upload**: Once your design is ready, simply click the blue **Save & Upload to Arduino** button. The application handles the compilation and flashing process in the background.

## 3. Troubleshooting

*   **Failed Upload**: Ensure no other programs (like the Arduino IDE or PlatformIO Serial Monitor) are using the COM port, or the upload will fail. If the issue persists, contact me via phone or WhatsApp.
*   **Manual Export**: If you prefer to use PlatformIO later, you can find the generated code in the `/src` folder as `main.cpp`.