sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"

],
    function (BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.AdminApplyLeave", {
            onInit: function () {
                this.getRouter().getRoute("RouteAdminApplyLeave").attachMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                var that = this
                that.i18nModelMess = that.getView().getModel('i18n').getResourceBundle();
                that.byId("idLeaveBarChart").setVisible(false);
                that.byId("idLeaveTableStandard").setVisible(true);
                that.byId("idleavefilterbar").setVisible(true);
                that.byId("idLeaveYear").setValue(new Date().getFullYear());
            },
        });
    });