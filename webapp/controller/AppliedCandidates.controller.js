sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.AppliedCandidates", {

        onInit: function () {
            const router = this.getOwnerComponent().getRouter();
            router
                .getRoute("AppliedCandidates")
                .attachPatternMatched(this._onObjectMatched, this);
        },
        _onObjectMatched: async function () {
            this.AC_ReadCall();
            // this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("RecruitementDashbord")); // Set header name
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Recruitement Dashbord");
        },

        AC_ReadCall: async function () {
            this.getBusyDialog();
            var data = await this.ajaxReadWithJQuery("JobApplications")
            // console.log(data.data);
            let tableModel = new JSONModel(data.data);
            this.getOwnerComponent().setModel(tableModel, "DataTableModel")
            this.closeBusyDialog();
        },
        onPressback: function () {
            this.getOwnerComponent().getRouter().navTo("RouteTilePage"); // Navigate to tile page
        },

        onLogout: function () {
            this.CommonLogoutFunction(); // Navigate to login page
        },
        ColumnPress: function (oEvent) {
            let data = oEvent.getSource().getBindingContext("DataTableModel");
            let id = data.getObject().ID;
            
            this.getOwnerComponent().getRouter().navTo("AppliedCanDetail", {id:id});
        }
    });
});
