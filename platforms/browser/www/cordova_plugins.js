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
        "file": "plugins/cordova-plugin-facebook/www/CordovaFacebook.js",
        "id": "cordova-plugin-facebook.CordovaFacebook",
        "pluginId": "cordova-plugin-facebook",
        "clobbers": [
            "CordovaFacebook"
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
    "cordova-plugin-facebook": "0.2.2"
}
// BOTTOM OF METADATA
});