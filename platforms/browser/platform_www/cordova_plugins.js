cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/cordova-plugin-inappbrowser/www/inappbrowser.js",
        "id": "cordova-plugin-inappbrowser.inappbrowser",
        "pluginId": "cordova-plugin-inappbrowser",
        "clobbers": [
            "cordova.InAppBrowser.open",
            "window.open"
        ]
    },
    {
        "file": "plugins/cordova-plugin-inappbrowser/src/browser/InAppBrowserProxy.js",
        "id": "cordova-plugin-inappbrowser.InAppBrowserProxy",
        "pluginId": "cordova-plugin-inappbrowser",
        "merges": [
            ""
        ]
    },
    {
        "file": "plugins/at.oneminutedistraction.phonenumber/www/phonenumber.js",
        "id": "at.oneminutedistraction.phonenumber.PhoneNumber",
        "pluginId": "at.oneminutedistraction.phonenumber",
        "clobbers": [
            "phonenumber"
        ]
    },
    {
        "file": "plugins/cordova-plugin-calendar/www/Calendar.js",
        "id": "cordova-plugin-calendar.Calendar",
        "pluginId": "cordova-plugin-calendar",
        "clobbers": [
            "Calendar"
        ]
    },
    {
        "file": "plugins/cordova-plugin-calendar/test/tests.js",
        "id": "cordova-plugin-calendar.tests",
        "pluginId": "cordova-plugin-calendar"
    },
    {
        "file": "plugins/com.phonegap.plugins.facebookconnect/www/facebook-native.js",
        "id": "com.phonegap.plugins.facebookconnect.FacebookConnectPlugin",
        "pluginId": "com.phonegap.plugins.facebookconnect",
        "clobbers": [
            "facebookConnectPlugin"
        ]
    },
    {
        "file": "plugins/com.phonegap.plugins.facebookconnect/www/facebook-browser.js",
        "id": "com.phonegap.plugins.facebookconnect.FacebookConnectPluginBrowser",
        "pluginId": "com.phonegap.plugins.facebookconnect",
        "clobbers": [
            "facebookConnectPlugin"
        ]
    },
    {
        "file": "plugins/cordova-plugin-facebook4/www/facebook-native.js",
        "id": "cordova-plugin-facebook4.FacebookConnectPlugin",
        "pluginId": "cordova-plugin-facebook4",
        "clobbers": [
            "facebookConnectPlugin"
        ]
    },
    {
        "file": "plugins/cordova-plugin-facebook4/www/facebook-browser.js",
        "id": "cordova-plugin-facebook4.FacebookConnectPluginBrowser",
        "pluginId": "cordova-plugin-facebook4",
        "clobbers": [
            "facebookConnectPlugin"
        ]
    },
    {
        "file": "plugins/cordova-plugin-keyboard/www/keyboard.js",
        "id": "cordova-plugin-keyboard.keyboard",
        "pluginId": "cordova-plugin-keyboard",
        "clobbers": [
            "window.Keyboard"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-whitelist": "1.0.0",
    "cordova-plugin-compat": "1.0.0",
    "cordova-plugin-geolocation": "2.2.0",
    "cordova-plugin-inappbrowser": "1.4.0",
    "at.oneminutedistraction.phonenumber": "0.0.1",
    "cordova-plugin-calendar": "4.4.2",
    "com.phonegap.plugins.facebookconnect": "1.7.1.3",
    "cordova-plugin-facebook4": "1.7.1",
    "cordova-plugin-keyboard": "1.1.4"
}
// BOTTOM OF METADATA
});