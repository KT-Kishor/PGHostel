sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetApproval", {
        onInit: function () {
            this.getRouter().getRoute("RouteTimesheetApproval").attachMatched(this._onRouteMatched, this);
            // ViewModel for button enable/disable
            const oViewModel = new JSONModel({ canApproveReject: false });
            this.getView().setModel(oViewModel, "approvalViewModel");
        },

        _onRouteMatched: async function () {
             var LoginFunction = await this.commonLoginFunction("TimesheetApproval");
            if (!LoginFunction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Timesheet Approval");

            // Get ManagerID from LoginModel
            const ManagerID = this.getView().getModel("LoginModel").getProperty("/EmployeeID");
            this.getBusyDialog();

            try {
                // Read all timesheet entries for employees under this manager
                const oData = await this.ajaxReadWithJQuery("Timesheet", { ManagerID: ManagerID });
                let timesheetData = Array.isArray(oData.data) ? oData.data : [oData.data];

                // Filter only "Submitted" status
                timesheetData = timesheetData.filter(entry => entry.Status === "Submitted");

                // Set filtered data to ApprovalTimesheetModel
                this.getView().setModel(new JSONModel(timesheetData), "ApprovalTimesheetModel");
            } catch (error) {
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }

            // Disable buttons initially
            this.getView().getModel("approvalViewModel").setProperty("/canApproveReject", false);
        },

        TSA_onSelect: function () {
            const oTable = this.byId("TSA_id_Table");
            const oSelectedItems = oTable.getSelectedItems();
            let canApproveReject = false;

            if (oSelectedItems.length > 0) {
                // Only enable if all selected items are "Submitted"
                canApproveReject = oSelectedItems.every(item =>
                    item.getBindingContext("ApprovalTimesheetModel").getProperty("Status") === "Submitted"
                );
            }

            this.getView().getModel("approvalViewModel").setProperty("/canApproveReject", canApproveReject);
        },

        TSA_onApprove: function () {
            this._openManagerRemarkDialog("Approved");
        },

        TSA_onReject: function () {
            this._openManagerRemarkDialog("Rejected");
        },

        _openManagerRemarkDialog: function (status) {
            this._approvalStatus = status; // Store for use on submit

            const sTitle = status === "Approved"
                ? this.i18nModel.getText("confirmApprove")
                : this.i18nModel.getText("confirmRejectleave");

            if (!this._oManagerRemarkDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.ManagerRemarks",
                    controller: this
                }).then(function (oDialog) {
                    this._oManagerRemarkDialog = oDialog;
                    this.getView().addDependent(oDialog);

                    oDialog.setTitle(sTitle);
                    sap.ui.getCore().byId("MIF_id_RemarkLabel").setText(
                        status === "Approved"
                            ? this.i18nModel.getText("approveRemark")
                            : this.i18nModel.getText("rejectRemark")
                    );
                    sap.ui.getCore().byId("MIF_id_remark").setValue("");

                    // Set button type and text
                    var oOkBtn = sap.ui.getCore().byId("MIF_id_OkBtn");
                    if (oOkBtn) {
                        oOkBtn.setType(status === "Approved" ? "Accept" : "Reject");
                        oOkBtn.setText(status === "Approved"
                            ? this.i18nModel.getText("approve")
                            : this.i18nModel.getText("reject"));
                    }

                    oDialog.open();
                }.bind(this));
            } else {
                this._oManagerRemarkDialog.setTitle(sTitle);
                sap.ui.getCore().byId("MIF_id_RemarkLabel").setText(
                    status === "Approved"
                        ? this.i18nModel.getText("approveRemark")
                        : this.i18nModel.getText("rejectRemark")
                );
                sap.ui.getCore().byId("MIF_id_remark").setValue("");

                // Set button type and text
                var oOkBtn = sap.ui.getCore().byId("MIF_id_OkBtn");
                if (oOkBtn) {
                    oOkBtn.setType(status === "Approved" ? "Accept" : "Reject");
                    oOkBtn.setText(status === "Approved"
                        ? this.i18nModel.getText("approve")
                        : this.i18nModel.getText("reject"));
                }

                this._oManagerRemarkDialog.open();
            }
        },

        MTF_onPressOk: async function () {
            const oTable = this.byId("TSA_id_Table");
            const oSelectedItems = oTable.getSelectedItems();
            const sRemark = sap.ui.getCore().byId("MIF_id_remark").getValue();

            if (!oSelectedItems.length) {
                MessageToast.show(this.i18nModel.getText("selctRowtoApprove"));
                return;
            }
            if (!sRemark) {
                MessageToast.show(this.i18nModel.getText("remarkRequired"));
                return;
            }

            const aPayload = oSelectedItems.map(item => {
                const srNo = item.getBindingContext("ApprovalTimesheetModel").getProperty("SrNo");
                return {
                    filters: { SrNo: srNo },
                    data: { Status: this._approvalStatus, ManagerRemark: sRemark }
                };
            });

            this.getBusyDialog();
            try {
                await this.ajaxUpdateWithJQuery("Timesheet", aPayload);
                MessageToast.show(
                    this._approvalStatus === "Approved"
                        ? this.i18nModel.getText("approvedSuccess")
                        : this.i18nModel.getText("rejectedSuccess")
                );
                this._oManagerRemarkDialog.close();
                this._onRouteMatched(); // Refresh data
            } catch (error) {
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },

        MIF_onPressClose: function () {
            if (this._oManagerRemarkDialog) {
                this._oManagerRemarkDialog.close();
            }
        },

        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        }
    });
});