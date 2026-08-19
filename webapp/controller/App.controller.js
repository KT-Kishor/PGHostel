sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox"
], function (Controller, MessageBox) {
  "use strict";

  return Controller.extend("sap.ui.com.project1.controller.App", {

    TIMEOUT_DURATION: 10 * 60 * 1000, // 10 minutes
    LAST_ACTIVITY_KEY: "lastActivity",

    _activityCheckInterval: null,
    _lastWriteTime: 0,
    _fnBoundResetTimer: null,

    onInit: function () {
      var oLoginModel = this.getView().getModel("LoginModel");

      if (oLoginModel && oLoginModel.getProperty("/isLoggedIn")) {
        this._startSessionTracking();
      }
    },

    onExit: function () {
      this._stopActivityChecker();
      this._detachEventHandlers();
    },

    _startSessionTracking: function () {
      if (!localStorage.getItem(this.LAST_ACTIVITY_KEY)) {
        localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
      }

      this._fnBoundResetTimer = this.resetLogoutTimer.bind(this);
      this._attachEventHandlers();
      this._startActivityChecker();
    },

    _attachEventHandlers: function () {
      if (this._bEventsAttached) {
        return;
      }
      this._bEventsAttached = true;

      var aEvents = ["mousemove", "keydown", "click", "touchstart"];
      aEvents.forEach(function (sEvent) {
        document.addEventListener(sEvent, this._fnBoundResetTimer, { passive: true });
      }.bind(this));
    },

    _detachEventHandlers: function () {
      if (!this._bEventsAttached) {
        return;
      }
      this._bEventsAttached = false;

      var aEvents = ["mousemove", "keydown", "click", "touchstart"];
      aEvents.forEach(function (sEvent) {
        document.removeEventListener(sEvent, this._fnBoundResetTimer);
      }.bind(this));
    },

    resetLogoutTimer: function () {
      var oLoginModel = this.getView().getModel("LoginModel");

      if (!oLoginModel || !oLoginModel.getProperty("/isLoggedIn")) {
        return;
      }

      var now = Date.now();
      // Throttle localStorage updates to at most once every 5 seconds (or 1/10th of timeout)
      var writeThrottle = Math.min(5000, this.TIMEOUT_DURATION / 10);

      if (now - this._lastWriteTime < writeThrottle) {
        return;
      }

      this._lastWriteTime = now;
      localStorage.setItem(this.LAST_ACTIVITY_KEY, now.toString());
    },

    _startActivityChecker: function () {
      this._stopActivityChecker();
      // Check inactivity state periodically (between 3 and 15 seconds)
      var checkInterval = Math.min(15000, Math.max(3000, this.TIMEOUT_DURATION / 4));
      this._activityCheckInterval = setInterval(this._checkInactivity.bind(this), checkInterval);
    },

    _stopActivityChecker: function () {
      if (this._activityCheckInterval) {
        clearInterval(this._activityCheckInterval);
        this._activityCheckInterval = null;
      }
    },

    _checkInactivity: function () {
      var sLastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
      if (!sLastActivity) {
        return;
      }

      var elapsed = Date.now() - parseInt(sLastActivity, 10);
      if (elapsed >= this.TIMEOUT_DURATION) {
        this.logoutUser();
      }
    },

    logoutUser: function () {
      // Cross-check latest activity across all tabs before firing logout
      var sLastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
      if (sLastActivity) {
        var elapsed = Date.now() - parseInt(sLastActivity, 10);
        if (elapsed < this.TIMEOUT_DURATION) {
          return; // Active in another tab
        }
      }

      if (window._sessionLogoutRunning) {
        return;
      }
      window._sessionLogoutRunning = true;

      this._stopActivityChecker();
      this._detachEventHandlers();

      var oLoginModel = this.getView().getModel("LoginModel");
      if (oLoginModel) {
        oLoginModel.setProperty("/isLoggedIn", false);
      }

      localStorage.clear();

      MessageBox.information(
        "Your session has expired due to inactivity. Please log in again to continue.",
        {
          title: "Session Expired",
          actions: [MessageBox.Action.OK],
          emphasizedAction: MessageBox.Action.OK,
          styleClass: "myUnifiedBtn",
          dependentOn: this.getView(),
          onClose: function () {
            window._sessionLogoutRunning = false;
            window.location.reload();
          }
        }
      );
    }
  });
});