class Logger {
    static DEBUG = 0;
    static INFO = 1;
    static WARN = 2;
    static ERROR = 3;
    
    static level = Logger.DEBUG; // Default to DEBUG for now
    static enabled = true;
    
    static setLevel(level) {
        this.level = level;
    }
    
    static enable() {
        this.enabled = true;
    }
    
    static disable() {
        this.enabled = false;
    }
    
    static group(title, level = Logger.INFO) {
        if (this.enabled && this.level <= level) {
            console.group(`📊 ${title}`);
        }
    }
    
    static groupEnd() {
        if (this.enabled) {
            console.groupEnd();
        }
    }
    
    static debug(message, data = null) {
        if (this.enabled && this.level <= Logger.DEBUG) {
            if (data) {
                console.log(`🔍 ${message}`, data);
            } else {
                console.log(`🔍 ${message}`);
            }
        }
    }
    
    static info(message, data = null) {
        if (this.enabled && this.level <= Logger.INFO) {
            if (data) {
                console.log(`ℹ️ ${message}`, data);
            } else {
                console.log(`ℹ️ ${message}`);
            }
        }
    }
    
    static success(message, data = null) {
        if (this.enabled && this.level <= Logger.INFO) {
            if (data) {
                console.log(`✅ ${message}`, data);
            } else {
                console.log(`✅ ${message}`);
            }
        }
    }
    
    static warn(message, data = null) {
        if (this.enabled && this.level <= Logger.WARN) {
            if (data) {
                console.warn(`⚠️ ${message}`, data);
            } else {
                console.warn(`⚠️ ${message}`);
            }
        }
    }
    
    static error(message, error = null) {
        if (this.enabled && this.level <= Logger.ERROR) {
            if (error) {
                console.error(`❌ ${message}`, error);
            } else {
                console.error(`❌ ${message}`);
            }
        }
    }
    
    static section(title, level = Logger.INFO) {
        if (this.enabled && this.level <= level) {
            console.log(`\n──────────────────────────────────────────`);
            console.log(` ${title}`);
            console.log(`──────────────────────────────────────────`);
        }
    }
    
    static table(data, title = null) {
        if (this.enabled && this.level <= Logger.DEBUG) {
            if (title) {
                console.log(`📋 ${title}:`);
            }
            console.table(data);
        }
    }
    
    static time(label) {
        if (this.enabled && this.level <= Logger.DEBUG) {
            console.time(`⏱️ ${label}`);
        }
    }
    
    static timeEnd(label) {
        if (this.enabled && this.level <= Logger.DEBUG) {
            console.timeEnd(`⏱️ ${label}`);
        }
    }
    
    static break() {
        if (this.enabled) {
            console.log('');
        }
    }
}

export { Logger };