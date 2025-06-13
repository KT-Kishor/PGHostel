sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetApproval", {
        onInit: function () {
            this.getRouter().getRoute("RouteTimesheetApproval").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Timesheet Approval");

            // Get manager's ID (adjust property as per your LoginModel)
            var sManagerID = this.getView().getModel("LoginModel").getProperty("/EmployeeID");

            this.getBusyDialog();
            try {
                // Fetch all submitted timesheets for employees under this manager
                const oData = await this.ajaxReadWithJQuery("Timesheet", {
                    Status: "Submitted"
                    // ManagerID: sManagerID // Uncomment if backend supports filtering by manager
                });
                const aAll = Array.isArray(oData.data) ? oData.data : [oData.data];
                // Frontend filter: only employees under this manager
                const aFiltered = aAll.filter(entry => entry.ManagerID === sManagerID);
                this.getView().setModel(new JSONModel(aFiltered), "ApprovalTimesheetModel");
            } catch (error) {
                MessageToast.show(error.message || error.responseText || "Error loading timesheets.");
            }
            this.closeBusyDialog();
        },

        onCalendarDateChange: function(oEvent) {
            var oCalendar = oEvent.getSource();
            var oSelectedDate = oCalendar.getStartDate();
            if (!oSelectedDate) return;

            var sDay = String(oSelectedDate.getDate()).padStart(2, '0');
            var sMonth = String(oSelectedDate.getMonth() + 1).padStart(2, '0');
            var sYear = oSelectedDate.getFullYear();
            var sFormattedDate = `${sDay}/${sMonth}/${sYear}`; // Adjust format as per your data

            var aAll = this.getView().getModel("ApprovalTimesheetModel").getData();
            var aFiltered = aAll.filter(function(entry) {
                return entry.Date === sFormattedDate;
            });
            this.getView().getModel("ApprovalTimesheetModel").setData(aFiltered);
        },

        onSearch: function(oEvent) {
            var sEmployeeID = this.byId("employeeIdInput")?.getValue();
            var aAll = this.getView().getModel("ApprovalTimesheetModel").getData();
            var aFiltered = aAll;
            if (sEmployeeID) {
                aFiltered = aFiltered.filter(function(entry) {
                    return entry.EmployeeID === sEmployeeID;
                });
            }
            this.getView().getModel("ApprovalTimesheetModel").setData(aFiltered);
        },

        TSA_onApprove: function () {
            this._updateSelectedStatus("Approved");
        },

        TSA_onReject: function () {
            this._updateSelectedStatus("Rejected");
        },

        _updateSelectedStatus: function (sStatus) {
            var oTable = this.byId("TSA_id_Table");
            var oSelectedItems = oTable.getSelectedItems();
            if (!oSelectedItems.length) {
                MessageToast.show(this.i18nModel.getText("selctRowtoApproveReject") || "Please select at least one row.");
                return;
            }
            var aPayload = oSelectedItems.map(function (item) {
                var srNo = item.getBindingContext("ApprovalTimesheetModel").getProperty("SrNo");
                return {
                    filters: { SrNo: srNo },
                    data: { Status: sStatus }
                };
            });

            this.getBusyDialog();
            this.ajaxUpdateWithJQuery("/Timesheet", aPayload)
                .then(() => {
                    MessageToast.show(this.i18nModel.getText("statusUpdateSuccess") || "Status updated successfully.");
                    this._onRouteMatched();
                })
                .catch((error) => {
                    MessageToast.show(error.responseText || "Error updating status.");
                })
                .finally(() => {
                    this.closeBusyDialog();
                });
        },
        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        },


        
    });
});