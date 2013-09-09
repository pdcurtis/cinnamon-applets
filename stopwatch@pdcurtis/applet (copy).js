/* This applet provides a Simple Stopwatch.
It is not only useful in its own right
but is also provides a framework for other more
complex applets - for example it provides a settings screen 
and a 'standard' right click (context) menu which opens 
the settings panel and a Housekeeping submenu accessing
the stylesheet file and a version/update files  
*/

const Applet = imports.ui.applet;
const Settings = imports.ui.settings;
const St = imports.gi.St; // ++
const PopupMenu = imports.ui.popupMenu; // ++ Needed for menus
const Lang = imports.lang; //  ++ Needed for menus
const GLib = imports.gi.GLib; // ++ Needed for starting programs
const Mainloop = imports.mainloop; // Needed for timer update loop


function MyApplet(metadata, orientation, panelHeight, instance_id) {
    this._init(metadata, orientation, panelHeight, instance_id);
}

MyApplet.prototype = {
    __proto__: Applet.TextApplet.prototype,

    _init: function(metadata, orientation, panelHeight, instance_id) {
        Applet.TextApplet.prototype._init.call(this, orientation, panelHeight, instance_id);
        try {
      this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id);  // ++ Picks up UUID from metadata for setup

        this.settings.bindProperty(Settings.BindingDirection.IN,  // Setting type
                "refreshInterval-spinner",  // The setting key
                "refreshInterval",  // The property to manage (this.refreshInterval)
                this.on_settings_changed,  // Callback when value changes
                null);               // Optional callback data


        // ++ Make metadata values available within applet for context menu.
        this.cssfile = metadata.path + "/stylesheet.css";              
        this.changelog = metadata.path + "/changelog.txt";  
        this.UUID = metadata.uuid;

        // ++ Build Context Menu
        this.buildContextMenu();

        // Set initial conditions
        this.startTime = this.getCurrentTime();
        this.counterReady = true;
        this.counterRunning = false;
	this.counterPaused = false;

        // Finally start the update loop for the applet display running
        this.updateLoop();
        } catch (e) {
            global.logError(e);
        }
        },

    // Function called when settings are changed
    on_settings_changed: function() {
         // Nothing needs to be called at present
    },

    // ++ Build the Right Click Context Menu
    buildContextMenu: function () {
        this._applet_context_menu.removeAll();
 
        let menuitem = new PopupMenu.PopupMenuItem("Settings");
        menuitem.connect('activate', Lang.bind(this, function (event) {
            GLib.spawn_command_line_async('cinnamon-settings applets ' + this.UUID);
        }));
        this._applet_context_menu.addMenuItem(menuitem);

        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // ++ Set up sub menu for Housekeeping and System Items
        this.subMenu1 = new PopupMenu.PopupSubMenuMenuItem("Housekeeping and System Sub Menu");
        this._applet_context_menu.addMenuItem(this.subMenu1);

        this.subMenuItem1 = new PopupMenu.PopupMenuItem("View the Changelog");
        this.subMenuItem1.connect('activate', Lang.bind(this, function (event) {
            GLib.spawn_command_line_async('gedit ' + this.changelog );
        }));
        this.subMenu1.menu.addMenuItem(this.subMenuItem1); // Note this has subMenu1.menu not subMenu1._applet_context_menu

 /*       this.subMenuItem3 = new PopupMenu.PopupMenuItem("Open stylesheet.css  (Advanced Function)");
        this.subMenuItem3.connect('activate', Lang.bind(this, function (event) {
            GLib.spawn_command_line_async('gedit ' + this.cssfile );
        }));
        this.subMenu1.menu.addMenuItem(this.subMenuItem3);
*/     },

    // Gets the current time in milliseconds from 1970
    getCurrentTime: function() {
        let d = new Date();
	    let x = Math.floor(d.getTime() / 1000 );
	    return x;
    },

    // Return time formated as hh:mm:ss or mm:ss if hours 0 with a verbose string is in this.verboseCount
    formatTime: function (value) {
       let temp = value;
       this.days = Math.floor(temp / (3600*24) );
       temp = temp - (this.days * 3600 * 24);
       this.hours = Math.floor(temp / 3600);
       temp = temp - (this.hours * 3600);
       this.minutes = Math.floor(temp / 60);
       this.seconds = temp - (this.minutes * 60);
       let string = "";
       this.verboseCount = "";
       if (this.days > 0) {this.verboseCount = this.verboseCount + this.days + " days "};
       if (this.hours > 0) {this.verboseCount = this.verboseCount + this.hours + " hours "};
       if (this.minutes < 10) { this.verboseCount = this.verboseCount + "0" };
       this.verboseCount = this.verboseCount + this.minutes + ":";
       if (this.seconds < 10) { this.verboseCount = this.verboseCount + "0" };
       this.verboseCount = this.verboseCount + this.seconds;
       if (this.hours > 0 && this.hours < 10) { string = string + "0"};
       if (this.hours > 0) { string = string + this.hours + ":"};
       if (this.minutes < 10) { string = string + "0" };
       string = string + this.minutes + ":";
       if (this.seconds < 10) { string = string + "0" };
       string = string + this.seconds
       return string ;
    },

    // Handler for when the applet is clicked - cycles through states  
    on_applet_clicked: function (event) {
        this.updateUI(); // Update as could be delayed from updateLoop
        if(this.counterReady) {
            this.counterRunning = true;
            this.counterPaused = this.counterReady = false;
            this.startTime = this.getCurrentTime();
        } else if(this.counterRunning) {
            this.counterPaused = true; 
	    this.counterReady = this.counterRunning = false;
        } else if(this.counterPaused) {
	    this.counterReady = true;
            this.counterRunning = this.counterPaused = false;
        }
    },

    // This updates the display in the applet and in the tooltip
    updateUI: function() {
         if(this.counterRunning) {
             this.currentCount = this.getCurrentTime() - this.startTime;
             this.set_applet_label(this.formatTime(this.currentCount));
 //            this.set_applet_tooltip("Stopwatch Running for " + this.days + " days and " + this.hours + " Hours "  + this.minutes + " minutes and " + this.seconds + " seconds" +  " - Click to Hold" ); 
            this.set_applet_tooltip("Stopwatch Running for  " + this.verboseCount + " - Click to Hold" ); 
         }
         if(this.counterPaused) {
             this.set_applet_label(this.formatTime(this.currentCount));
             this.set_applet_tooltip("Stopwatch Paused at " + this.verboseCount + " - Click to Reset"); 

         }
         if(this.counterReady) {
             this.set_applet_tooltip("Stopwatch Ready - Click to Start");
             this.set_applet_label("00:00");
         }
    },

    // This is the loop run at refreshInterval rate to call updateUI() to update the display in the applet and tooltip
    updateLoop: function() {
        this.updateUI();
        Mainloop.timeout_add_seconds(this.refreshInterval, Lang.bind(this, this.updateLoop));
    },

    // This finalises the settings when the applet is removed from the panel
     on_applet_removed_from_panel: function() {
        this.settings.finalize();
    }
};

function main(metadata, orientation, panelHeight, instance_id) {
    let myApplet = new MyApplet(metadata, orientation, panelHeight, instance_id);
    return myApplet;
}
