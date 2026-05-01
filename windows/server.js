const path = require('path');
const isPkg = typeof process.pkg !== 'undefined';
const rootPath = isPkg ? path.dirname(process.execPath) : __dirname;

if (isPkg) {
    module.paths.unshift(path.join(rootPath, 'node_modules'));
}

const { ReadlineParser } = require('@serialport/parser-readline');
const { execSync, exec } = require('child_process');
const { SerialPort } = require('serialport');
const express = require('express');
const fs = require('fs-extra');
const os = require('os');
const app = express();

// --- CONFIGURATION & PATHS ---
const BIN_DIR = path.resolve(rootPath, 'bin');
const AVR_GPP = path.join(BIN_DIR, 'avr-gcc', 'bin', 'avr-g++');
const AVR_OBJCOPY = path.join(BIN_DIR, 'avr-gcc', 'bin', 'avr-objcopy');
const AVRDUDE = path.join(BIN_DIR, 'avrdude', 'avrdude.exe');
const AVR_CONF = path.join(BIN_DIR, 'avrdude', 'avrdude.conf');
const LIB_FRAMEWORK = path.join(BIN_DIR, 'libFrameworkArduino.a');

const INCLUDE_PATH = path.join(BIN_DIR, 'Framework-Arduino-Uno', 'cores', 'arduino');
const VARIANT_PATH = path.join(BIN_DIR, 'Framework-Arduino-Uno', 'variants', 'standard');

// --- LOGGING HELPER ---
const log = {
    info: (msg) => console.log(`[${new Date().toLocaleTimeString()}] [INFO] ${msg}`),
    err: (msg) => console.error(`[${new Date().toLocaleTimeString()}] [ERROR] ${msg}`),
    success: (msg) => console.log(`[${new Date().toLocaleTimeString()}] [SUCCESS] ${msg}`)
};

// --- SERIAL MANAGEMENT ---
let globalSerial = null;
let lastStatus = "Disconnected";
let arduinoOnActiveUse = false;

async function findArduinoPort() {
    const ports = await SerialPort.list();
    const port = ports.find(p =>
        p.manufacturer?.includes('Arduino') ||
        p.friendlyName?.includes('Arduino') ||
        p.pnpId?.includes('USB\\VID_1A86') ||
        p.pnpId?.includes('USB\\VID_2341')
    );
    return port ? port.path : null;
}

async function initSerialMonitor() {
    if (arduinoOnActiveUse) return;

    const portPath = await findArduinoPort();

    if (!portPath) {
        if (globalSerial) {
            log.err("Port lost. Cleaning up handle...");
            globalSerial = null;
        }
        lastStatus = "Disconnected: No Device Found";
        currentPortPath = null;
        return;
    }

    if (globalSerial && globalSerial.isOpen && currentPortPath === portPath) return;

    log.info(`Attempting to open monitor on ${portPath}...`);

    globalSerial = new SerialPort({ path: portPath, baudRate: 57600 }, (err) => {
        if (err) {
            log.err("Failed to open port: " + err.message);
            globalSerial = null;
            lastStatus = "Disconnected: Port Busy";
        }
    });

    if (!globalSerial) return;

    currentPortPath = portPath;
    const parser = globalSerial.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    globalSerial.on('open', () => {
        log.success(`Monitor active on ${portPath}`);
    });

    globalSerial.on('close', () => {
        log.err("Serial connection closed.");
        lastStatus = "Disconnected";
        globalSerial = null;
        currentPortPath = null;
    });

    globalSerial.on('error', (err) => {
        log.err("Serial Error: " + err.message);
        lastStatus = "Error: " + err.message;
        globalSerial = null;
        currentPortPath = null;
    });

    parser.on('data', (data) => {
        if (data.startsWith("RUNNING:")) {
            lastStatus = data;
        }
    });
}

setInterval(() => {
    if (arduinoOnActiveUse == false && globalSerial == null) {
        initSerialMonitor();
    }
}, 1000);

// --- PORT FIND HELPER ---
async function findArduinoPort() {
    const ports = await SerialPort.list();

    const port = ports.find(p =>
        p.manufacturer?.includes('Arduino') ||
        p.friendlyName?.includes('Arduino') ||
        p.pnpId?.includes('USB\\VID_1A86') || // CH340 (Arduino Uno Clone)
        p.pnpId?.includes('USB\\VID_2341')    // Official Arduino
    );

    if (port) {
        log.info(`Detected device on ${port.path}`);
        return port.path;
    }

    if (ports.length > 0) {
        log.info(`No explicit Arduino found, trying first available: ${ports[0].path}`);
        return ports[0].path;
    }

    return null;
}

// --- INITIALIZATION ---
function initData() {
    const srcDir = path.join(process.cwd(), 'src');
    const filePath = path.join(srcDir, 'main.cpp');

    if (!fs.existsSync(filePath)) {
        log.info("No existing code found. Creating default template...");

        const defaultCode = `#include <Arduino.h>

bool overrideActive = false;
int liveFan = 0;
int liveSmoke = 0;
int liveIndex = 0;
const char* lastAttr = "init";

struct PinMapping { const char *name; int pin; };
struct Step { const char *attr; long value; };

PinMapping myPins[] = { {"fan", 5}, {"smoke", 10} };

// Smoke Config
Step preSequence[] = { 
    {"smoke", 1},
    {"wait", 5000} };
Step mainSequence[] = { 
    {"fan", 1},
    {"wait", 250},
    {"fan", 0},
    {"wait", 30000},
    {"fan", 1},
    {"wait", 350},
    {"fan", 0},
    {"wait", 60000},
    {"fan", 1},
    {"wait", 250},
    {"fan", 0},
    {"wait", 120000},
    {"fan", 1},
    {"wait", 500},
    {"fan", 0},
    {"wait", 45000},
    {"fan", 1},
    {"wait", 300},
    {"fan", 0},
    {"wait", 10000},
    {"fan", 1},
    {"wait", 300},
    {"fan", 0},
    {"wait", 70000}
};

// --- Code to run the Seq ---
int getPinByName(const char *name) {
  for (unsigned int i = 0; i < sizeof(myPins) / sizeof(myPins[0]); i++) {
    if (strcmp(myPins[i].name, name) == 0) return myPins[i].pin;
  }
  return -1;
}

void reportStatus(const char* currentStep) {
    Serial.print("RUNNING:");
    Serial.print(currentStep);
    Serial.print("|INDEX:");
    Serial.print(liveIndex);
    Serial.print("|FAN:");
    Serial.print(liveFan);
    Serial.print("|SMOKE:");
    Serial.println(liveSmoke);
}

void updateHardware() {
    int fanPin = getPinByName("fan");
    int smokePin = getPinByName("smoke");
    if (fanPin != -1) digitalWrite(fanPin, (liveFan == 1 ? LOW : HIGH));
    if (smokePin != -1) digitalWrite(smokePin, (liveSmoke == 1 ? LOW : HIGH));
}

// --- The Listener ---
void checkSerial() {
    if (Serial.available() > 0) {
        String msg = Serial.readStringUntil('\\n');

        msg.trim();

        if (msg == "MANUAL:ON") {
            overrideActive = true;
        } 
        else if (msg == "MANUAL:OFF") {
            overrideActive = false;
        }
        
        if (overrideActive) {
            if (msg.indexOf("FAN:1") >= 0) liveFan = 1;
            if (msg.indexOf("FAN:0") >= 0) liveFan = 0;
            if (msg.indexOf("SMOKE:1") >= 0) liveSmoke = 1;
            if (msg.indexOf("SMOKE:0") >= 0) liveSmoke = 0;
            updateHardware();
        }
    }
}

void executeStep(Step s, int index) {
    // If manual mode was turned on, skip the auto sequence
    if (overrideActive) return;

    lastAttr = s.attr;
    liveIndex = index;

    if (strcmp(s.attr, "wait") == 0) {
        long remaining = s.value;
        while (remaining > 0 && !overrideActive) { 
            reportStatus("wait"); // Keep reporting while waiting
            checkSerial(); 
            delay(100); 
            remaining -= 100; 
        }
    } else {
        int pin = getPinByName(s.attr);
        if (pin != -1) { 
            if (strcmp(s.attr, "fan") == 0) liveFan = s.value;
            if (strcmp(s.attr, "smoke") == 0) liveSmoke = s.value;
            
            digitalWrite(pin, (s.value == 1 ? LOW : HIGH)); 
        }
        reportStatus(s.attr);
    }
}

void setup() {
  Serial.begin(57600);
  for (unsigned int i = 0; i < sizeof(myPins) / sizeof(myPins[0]); i++) {
    pinMode(myPins[i].pin, OUTPUT);
    digitalWrite(myPins[i].pin, HIGH); // Start OFF (Relay HIGH = OFF)
  }
  
  // Run Pre-sequence
  for (unsigned int i = 0; i < sizeof(preSequence) / sizeof(preSequence[0]); i++) { 
    if (overrideActive) break;
    executeStep(preSequence[i], -1); 
  }
}

void loop() {
    checkSerial(); // Always check for Manual Master switch

    if (overrideActive) {
        reportStatus("MANUAL");
        delay(200); // Slow down the loop slightly in manual mode
    } else {
        for (unsigned int i = 0; i < sizeof(mainSequence) / sizeof(mainSequence[0]); i++) {
            if (overrideActive) break; // Exit sequence immediately if manual turned on
            executeStep(mainSequence[i], i);
        }
    }
}`;

        if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
        fs.writeFileSync(filePath, defaultCode);
        log.success("Default main.cpp created.");
    } else {
        log.info("Existing main.cpp detected. Ready to load data.");
    }
}

initData();

app.use(express.json());

const publicPath = isPkg
    ? path.join(__dirname, 'public')
    : path.join(process.cwd(), 'public');

app.use(express.static(publicPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/api/state', (req, res) => {
    const filePath = path.join(process.cwd(), 'src', 'main.cpp');
    if (!fs.existsSync(filePath)) return res.json({ pre: [], main: [] });

    const code = fs.readFileSync(filePath, 'utf8');
    function parseSequence(varName) {
        const regex = new RegExp(`${varName}\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\};`);
        const match = code.match(regex);
        if (!match) return [];
        const items = [];
        const itemRegex = /\{"([^"]+)",\s*(\d+)\}/g;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(match[1])) !== null) {
            items.push({ attr: itemMatch[1], value: parseInt(itemMatch[2]) });
        }
        return items;
    }

    res.json({
        pre: parseSequence('preSequence'),
        main: parseSequence('mainSequence')
    });
});

app.post('/api/upload', async (req, res) => {
    if (globalSerial && globalSerial.isOpen) {
        arduinoOnActiveUse = true;
        log.info("Closing monitor for upload...");
        await new Promise((resolve) => {
            globalSerial.close(() => {
                globalSerial = null;
                resolve();
            });
        });
    }

    await new Promise(r => setTimeout(r, 500));

    const comPort = await findArduinoPort();
    if (!comPort) {
        return res.status(500).json({ error: "No COM port detected." });
    }

    const { state } = req.body;
    const projectRoot = process.cwd();
    const srcPath = path.join(projectRoot, 'src', 'main.cpp');

    if (!fs.existsSync(srcPath)) {
        return res.status(500).json({ error: "main.cpp not found in src folder." });
    }

    let code = fs.readFileSync(srcPath, 'utf8');

    const preStr = state.pre.map(s => `{"${s.attr}", ${s.value}}`).join(', ');
    const mainStr = state.main.map(s => `{"${s.attr}", ${s.value}}`).join(', ');

    code = code.replace(/(preSequence\[\]\s*=\s*\{)([\s\S]*?)(\};)/, `$1 ${preStr} $3`);
    code = code.replace(/(mainSequence\[\]\s*=\s*\{)([\s\S]*?)(\};)/, `$1 ${mainStr} $3`);

    fs.writeFileSync(srcPath, code);

    log.info("Starting build process with updated main.cpp...");
    const elf = path.join(projectRoot, 'src', 'main.elf');
    const hex = path.join(projectRoot, 'src', 'main.hex');

    try {
        log.info("Compiling...");
        const compileCmd = `"${AVR_GPP}" -B"${path.join(BIN_DIR, 'avr-gcc', 'bin')}" -Os -Wall -mmcu=atmega328p -DF_CPU=16000000L -I"${INCLUDE_PATH}" -I"${VARIANT_PATH}" "${srcPath}" "${LIB_FRAMEWORK}" -o "${elf}"`;
        execSync(compileCmd);

        execSync(`"${AVR_OBJCOPY}" -O ihex -R .eeprom "${elf}" "${hex}"`);

        log.info("Flashing...");
        const uploadCmd = `"${AVRDUDE}" -C "${AVR_CONF}" -p atmega328p -c arduino -P ${comPort} -b 115200 -D -U flash:w:"${hex}":i`;

        exec(uploadCmd, (error, stdout, stderr) => {
            if (error) return res.status(500).json({ error: stderr });
            log.success("Arduino updated via surgical string replacement!");
            arduinoOnActiveUse = false;
            initSerialMonitor();
            res.json({ message: 'Success' });
        });
    } catch (err) {
        arduinoOnActiveUse = false;
        initSerialMonitor();
        res.status(500).json({ error: "Build failed: " + err.message });
    }
});

app.get('/api/check-device', async (req, res) => {
    log.info("Probing Ports...");

    if (globalSerial && globalSerial.isOpen) {
        log.info("Closing monitor for ports check...");
        arduinoOnActiveUse = true;
        await new Promise((resolve) => {
            globalSerial.close(() => {
                globalSerial = null;
                resolve();
            });
        });
    }

    const comPort = await findArduinoPort();

    if (!comPort) {
        arduinoOnActiveUse = false;
        initSerialMonitor();
        return res.json({ connected: false, details: "No serial devices detected." });
    }

    log.success(`Using Port: ${comPort}`);

    const probeCmd = `"${AVRDUDE}" -C "${AVR_CONF}" -p atmega328p -c arduino -P ${comPort} -n`;

    exec(probeCmd, (err, stdout, stderr) => {

        arduinoOnActiveUse = false;
        initSerialMonitor();

        if (err) {
            return res.json({ connected: false, details: "No Arduino Uno Found" });
        }
        res.json({ connected: true, details: "Arduino Uno" });
    });
});

// Endpoint to get the live status ping
app.get('/api/live-status', (req, res) => {
    res.json({ status: lastStatus });
});

// Endpoint to send manual commands
app.post('/api/command', (req, res) => {

    if (!req.body || !req.body.cmd) {
        return res.status(400).json({ error: "No command provided" });
    }

    const { cmd } = req.body;
    if (globalSerial && globalSerial.isOpen) {
        globalSerial.write(cmd + "\n");
        return res.json({ success: true });
    }
    res.status(500).json({ error: "Serial port not open" });
});

const PORT = 3000;
app.listen(PORT, () => {
    log.success(`Server running at http://localhost:${PORT}`);
    log.info("Bundled Toolchain initialized.");
    const startCmd = process.platform === 'win32' ? 'start' : 'open';
    exec(`${startCmd} http://localhost:${PORT}`);
    initSerialMonitor();
});