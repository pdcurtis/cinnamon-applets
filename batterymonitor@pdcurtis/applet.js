/* This is a basic Battery  Applet with Monitoring and Shutdown (BAMS)
It is not only useful in its own right
but is also provides a 'tutorial' framework for other more
complex applets - for example it provides a settings screen 
and a 'standard' right click (context) menu which opens 
the settings panel and a Housekeeping submenu accessing
help and a version/update files and also the nVidia settings program,
the gnome system monitor program and the Power monitor
in case you want to find out how much resources this applet is 
using at various update rates. 
Items with a ++ in the comment are useful for re-use
*/
const Applet = imports.ui.applet; // ++
const Settings = imports.ui.settings; // ++ Needed if you use Settings Screen
const St = imports.gi.St; // ++
const PopupMenu = imports.ui.popupMenu; // ++ Needed for menus
const Lang = imports.lang; //  ++ Needed for menus
const GLib = imports.gi.GLib; // ++ Needed for starting programs
const Mainloop = imports.mainloop; // Needed for timer update loop

// ++ Always needed
function MyApplet(metadata, orientation, panelHeight, instance_id) {
    this._init(metadata, orientation, panelHeight, instance_id);
}

// ++ Always needed
MyApplet.prototype = {
    __proto__: Applet.Applet.prototype, // Text Applet

    _init: function(metadata, orientation, panelHeight, instance_id) {
        Applet.TextApplet.prototype._init.call(this, orientation, panelHeight, instance_id);
        try {
            this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id); // ++ Picks up UUID from metadata for Settings

            this.settings.bindProperty(Settings.BindingDirection.IN, // Setting type
                "refreshInterval-spinner", // The setting key
                "refreshInterval", // The property to manage (this.refreshInterval)
                this.on_settings_changed, // Callback when value changes
                null); // Optional callback data

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "alertPercentage",
                "alertPercentage",
                this.on_settings_changed,
                null);

            // ++ Make metadata values available within applet for context menu.
            this.cssfile = metadata.path + "/stylesheet.css"; // No longer required
            this.changelog = metadata.path + "/changelog.txt";
            this.helpfile = metadata.path + "/help.txt";

            this.batterytempscript = metadata.path + "/batterytempscript.sh";
            this.appletPath = metadata.path;
            this.UUID = metadata.uuid;
            this.nvidiagputemp = 0;

            this.applet_running = true; //** New to allow applet to be fully stopped when removed from panel

            // Choose Text Editor depending on whether Mint 18 with Cinnamon 3.0 and latter
            if (this.versionCompare(GLib.getenv('CINNAMON_VERSION'), "3.0") <= 0) {
                this.textEd = "gedit";
            } else {
                this.textEd = "xed";
            }

            // ++ Set up left click menu
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager.addMenu(this.menu);

            // ++ Add text actor to Applet
            this.appletLabel = new St.Label({
                reactive: true,
                track_hover: true,
                //           style_class: "spacer-applet"
            });
            this.actor.add(this.appletLabel, {
                y_align: St.Align.MIDDLE,
                y_fill: false
            });

            // ++ Set initial value of text
            this.appletLabel.set_text("  Wait  ");

            // ++ Build Context (Right Click) Menu
            this.buildContextMenu();
            this.makeMenu();

            // Make sure the temp files are created

            GLib.spawn_command_line_async('touch /tmp/.gpuTemperature');
            GLib.spawn_command_line_async('touch /tmp/.batteryPercentage');
            GLib.spawn_command_line_async('touch /tmp/.batteryState');

            // Finally setup to start the update loop for the applet display running
            //           this.set_applet_label(" " ); // show nothing until system stable
            this.set_applet_tooltip("Waiting");
            this.on_settings_changed()
            Mainloop.timeout_add_seconds(2, Lang.bind(this, this.updateLoop)); // Timer to allow bumbleebee to initiate

        } catch (e) {
            global.logError(e);
        }
    },

    // Compare two version numbers (strings) based on code by Alexey Bass (albass)
    // Takes account of many variations of version numers including cinnamon.
    versionCompare: function(left, right) {
        if (typeof left + typeof right != 'stringstring')
            return false;
        var a = left.split('.'),
            b = right.split('.'),
            i = 0,
            len = Math.max(a.length, b.length);
        for (; i < len; i++) {
            if ((a[i] && !b[i] && parseInt(a[i]) > 0) || (parseInt(a[i]) > parseInt(b[i]))) {
                return 1;
            } else if ((b[i] && !a[i] && parseInt(b[i]) > 0) || (parseInt(a[i]) < parseInt(b[i]))) {
                return -1;
            }
        }
        return 0;
    },

    // ++ Function called when settings are changed
    on_settings_changed: function() {
        this.slider_demo.setValue((this.alertPercentage - 10) / 50);

        this.updateLoop();
    },

    // ++ Null function called when Generic (internal) Setting changed
    on_generic_changed: function() {},

    on_slider_changed: function(slider, value) {
        this.alertPercentage = (value * 50) + 10; // This is our BIDIRECTIONAL setting - by updating this.scale_val,
        // Our configuration file will also be updated

    },

    // ++ Build the Right Click Context Menu
    buildContextMenu: function() {
        try {
            this._applet_context_menu.removeAll();

            this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            let menuitem2 = new PopupMenu.PopupMenuItem("Open Power Statistics");
            menuitem2.connect('activate', Lang.bind(this, function(event) {
                GLib.spawn_command_line_async('gnome-power-statistics');
            }));
            this._applet_context_menu.addMenuItem(menuitem2);

            this.menuitem3 = new PopupMenu.PopupMenuItem("Open System Monitor");
            this.menuitem3.connect('activate', Lang.bind(this, function(event) {
                GLib.spawn_command_line_async('gnome-system-monitor');
            }));
            this._applet_context_menu.addMenuItem(this.menuitem3);

            this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // ++ Set up sub menu for Housekeeping and System Items
            this.subMenu1 = new PopupMenu.PopupSubMenuMenuItem("Housekeeping and System Sub Menu");
            this._applet_context_menu.addMenuItem(this.subMenu1);

            this.subMenuItem1 = new PopupMenu.PopupMenuItem("View the Changelog");
            this.subMenuItem1.connect('activate', Lang.bind(this, function(event) {
                GLib.spawn_command_line_async(this.textEd + ' ' + this.changelog);
            }));
            this.subMenu1.menu.addMenuItem(this.subMenuItem1); // Note this has subMenu1.menu not subMenu1._applet_context_menu as one might expect

            this.subMenuItem2 = new PopupMenu.PopupMenuItem("Open the Help file");
            this.subMenuItem2.connect('activate', Lang.bind(this, function(event) {
                GLib.spawn_command_line_async(this.textEd + ' ' + this.helpfile);
            }));
            this.subMenu1.menu.addMenuItem(this.subMenuItem2);

        } catch (e) {
            global.logError(e);
        }
    },

    //++ Build left click menu 
    makeMenu: function() {
        try {
            this.menu.removeAll();

            this.menuitemHead1 = new PopupMenu.PopupMenuItem("Battery Monitor", {
                reactive: false
            });
            this.menu.addMenuItem(this.menuitemHead1);

            this.menuitemInfo2 = new PopupMenu.PopupMenuItem("     Note: Alerts not enabled in Settings", {
                reactive: false
            });
            this.menu.addMenuItem(this.menuitemInfo2);

            this.slider_demo = new PopupMenu.PopupSliderMenuItem(0);
            this.slider_demo.connect("value-changed", Lang.bind(this, this.on_slider_changed));
            this.menu.addMenuItem(this.slider_demo);
            //        this.on_settings_changed();
        } catch (e) {
            global.logError(e);
        }
    },

    //++ Handler for when the applet is clicked. 
    on_applet_clicked: function(event) {
        this.updateLoop();
        this.menu.toggle();
    },

    // This updates the numerical display in the applet and in the tooltip
    updateUI: function() {

        try {
            this.batteryPercentage = GLib.file_get_contents("/tmp/.batteryPercentage").toString();
            this.batteryPercentage = this.batteryPercentage.trim().substr(5);
            this.batteryState = GLib.file_get_contents("/tmp/.batteryState").toString();
            this.batteryState = this.batteryState.trim().substr(5);

            this.actor.set_style('width:35px');
            this.actor.style_class = 'bam-normal';
            
            if (Math.floor(this.batteryPercentage) / 4 < Math.floor(this.alertPercentage)) {
                this.actor.style_class = 'bam-alert';
                if (this.batteryState.indexOf("discharg") > -1) {
                    this.actor.set_style('width:200px');
                }
            }

            if (Math.floor(this.batteryPercentage) / 4 < Math.floor(this.alertPercentage) / 2) {
                this.actor.style_class = 'bam-limit-exceeded';

                if (this.batteryState.indexOf("discharg") > -1) {
                    this.actor.set_style('width:250px');
                    // Add call to suspend script here
                }
            }

            this.appletLabel.set_text(this.batteryPercentage + "%");

            this.set_applet_tooltip("Percentage Charge is " + this.batteryPercentage + "% " + "(" + this.batteryState + ")" + " Warning set at: " + Math.floor(this.alertPercentage) + "%");
            this.menuitemInfo2.label.text = "Percentage Charge: " + this.batteryPercentage + "% " + this.batteryState + " Warning set at: " + Math.floor(this.alertPercentage) + "%";

            // Get temperatures via asyncronous script ready for next cycle
            GLib.spawn_command_line_async('sh ' + this.batterytempscript);

        } catch (e) {
            global.logError(e);
        }
    },

    // This is the loop run at refreshInterval rate to call updateUI() to update the display in the applet and tooltip
    updateLoop: function() {
        this.updateUI();
        // Also inhibit when applet after has been removed from panel
        if (this.applet_running == true) {
            Mainloop.timeout_add_seconds(this.refreshInterval, Lang.bind(this, this.updateLoop));
        }
    },

    // ++ This finalises the settings when the applet is removed from the panel
    on_applet_removed_from_panel: function() {
        // inhibit the update timer when applet removed from panel
        this.applet_running = false;
        this.settings.finalize();
    }

};

function main(metadata, orientation, panelHeight, instance_id) {
    let myApplet = new MyApplet(metadata, orientation, panelHeight, instance_id);
    return myApplet;
}
/*
Version v30_1.1.0
v30_1.0.0 Developed using code from NUMA, Bumblebee and Timer Applets
          Includes changes to work with Mint 18 and Cinnamon 3.0 -gedit -> xed
          Tested with Cinnamon 3.0 in Mint 18 
          batteryPercentage divided by 4 to allow testing
          Display only Version without Suspend Script
          Beautified
*/
