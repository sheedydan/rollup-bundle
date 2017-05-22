/**
 * Created by Tim on 7/05/2017.
 */
/// <reference path="../../../../../Scripts/typings/index.ts" />
'use strict';
class AjaxTracker {
    protected trackedItems = [];
    protected findFirst = (items, predicate) => {
        for (var i = 0; i < items.length; i++) {
            if (predicate(items[i])) {
                return items[i];
            }
        }
        return null;
    };
    get count(): number {
        return this.trackedItems.length;
    }
    tracked = (appName, id = "") => {
        appName = appName.toLowerCase();
        if (id) {
            id = (id + "").toLowerCase();
        }
        return this.findFirst(this.trackedItems,
            item => (item.appName === appName && (id === "" || item.id === id)));
    };
    track = (appName, id = "") => {
        appName = appName.toLowerCase();
        if (id) {
            id = (id + "").toLowerCase();
        }
        this.trackedItems.push({ appName: appName, id: id, create: new Date() });
    };
    untrack = (appName, id = "") => {
        appName = appName.toLowerCase();
        if (id) {
            id = (id + "").toLowerCase();
        }

        var existing = this.findFirst(this.trackedItems, item => (item.appName === appName && item.id === id));
        if (existing) {
            var index = this.trackedItems.indexOf(existing);
            if (index > -1) {
                this.trackedItems.splice(index, 1);
            }

        }
    };
}
(() => {
    "use strict";
    angular.module("shared.tracker", [])
        .controller("shared.tracker.controller", [
            "$scope", "shared.tracker", ($scope, tracker) => {
                $scope.tracker = tracker;
            }
        ])
        .factory("shared.tracker", [
            () => {
                return new AjaxTracker();
            }
        ]);
})();