# Arduino Pin Sequencer - Setup Guide

This project allows you to define custom sequences for any number of pins using simple "Name" and "Duration" pairs. It includes a live countdown in the Serial Monitor.

This can be used for smoke machines, LEDs, or relais that should be controlled using an Arduino Uno with simple HIGH / LOW pin automation.

---

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

Instead of creating a new project, it is recommended to use the pre-configured files from this repository.

1. **Download the Repository**:
   * Click the green **Code** button on GitHub and select **Download ZIP**, or clone it.
2. **Open in VS Code**:
   * Extract the Zip File.
   * Open VS Code.
   * Go to **File > Open Folder...** and select the extracted folder.
3. **Initialize PlatformIO**:
   * PlatformIO will automatically detect the `platformio.ini` file and start configuring the environment (this may take a minute the first time).
4. **Locate the Code**:
   * In the left-hand explorer, open the `src` folder and select `main.cpp`.
   * This is where you can customize your `PinMapping` and `mainLoop` sequences.
5. **Check Settings**:
   * Ensure the `platformio.ini` file has the correct `board` its set to Arduino Uno as default.
     If you are using a Mega or Nano, change this (`board = uno`) line accordingly.
---

## 3. Change time settings

The code is designed so you only edit the top configuration area.

### Define your Hardware (`PinMapping`)
Map a human-readable name to a physical Arduino Pin.
```cpp
PinMapping myPins[] = {
    {"smoke", 4},  // Physical Pin 4 is now "smoke"
    {"wait", 12}   // Physical Pin 12 is used for pauses/status
};

Step mainLoop[] = {
    {"wait", 8000}, // Turn on pin that is defined under "wait" for 8 seconds (8000ms)
    {"smoke", 500}, // Turn on pin "smoke" for 0.5 seconds (500ms)
    {"wait", 22000}} // Turn on pin "wait" for 22 seconds (22000ms)
```
(Notice comment inside the code are german)