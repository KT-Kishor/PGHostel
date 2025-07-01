sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/suite/ui/commons/Timeline", // Import Timeline for displaying comments
    "sap/suite/ui/commons/TimelineItem", //Import TimelineItem for individual comments
], function (BaseController, utils, JSONModel, MessageToast, Timeline, TimelineItem) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetApproval", {
        onInit: function () {
            this.getRouter().getRoute("RouteTimesheetApproval").attachMatched(this._onRouteMatched, this);

        },

        _onRouteMatched: async function () {
            var LoginFunction = await this.commonLoginFunction("TimesheetApproval");
            if (!LoginFunction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Timesheet Approval");

            // Get ManagerID from LoginModel
            const ManagerID = this.getView().getModel("LoginModel").getProperty("/EmployeeID");

            await this.readSubmittedTimesheetsForManager(ManagerID);
            // ViewModel for button enable/disable
            const oViewModel = new JSONModel({ canApproveReject: false });
            this.getView().setModel(oViewModel, "approvalViewModel");

            // Disable buttons initially
            this.getView().getModel("approvalViewModel").setProperty("/canApproveReject", false);
        },
        readSubmittedTimesheetsForManager: async function (ManagerID) {
            this.getBusyDialog();
            try {
                // Read all timesheet entries for employees under this manager
                const oData = await this.ajaxReadWithJQuery("Timesheet", { ManagerID: ManagerID });
                let timesheetData = Array.isArray(oData.data) ? oData.data : [oData.data];

                // Filter only "Submitted, approved, rejected" status
                timesheetData = timesheetData.filter(entry => ["Submitted", "Approved", "Rejected"].includes(entry.Status));

                // Set filtered data to ApprovalTimesheetModel
                this.getView().setModel(new sap.ui.model.json.JSONModel(timesheetData), "ApprovalTimesheetModel");
            } catch (error) {
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }
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
            if (!utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MIF_id_remark"), "ID")) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            const aPayload = oSelectedItems.map(item => {
                const srNo = item.getBindingContext("ApprovalTimesheetModel").getProperty("SrNo");
                const managerName = item.getBindingContext("ApprovalTimesheetModel").getProperty("ManagerName");
                return {
                    filters: { SrNo: srNo },
                    data: {
                        Status: this._approvalStatus,
                        ManagerName :managerName
                    }
                };
            });
            //aPayload.comments = sRemark ;
            const finalPayload = {
                comments : sRemark,
                data: aPayload
            };

            this.getBusyDialog();
            try {
                await this.ajaxUpdateWithJQuery("Timesheet", finalPayload);
                MessageToast.show(
                    this._approvalStatus === "Approved"
                        ? this.i18nModel.getText("approvedSuccess")
                        : this.i18nModel.getText("rejectedSuccess")
                );
                this._oManagerRemarkDialog.close();
                this._onRouteMatched(); // Refresh table
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
        },
        TSA_onSearch: async function () {
            try {
                this.getBusyDialog();
                var aFilterItems = this.byId("TSA_id_Filter").getFilterGroupItems();
                var params = {};
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl();
                    var sValue = oItem.getName();
                    if (oControl && oControl.getValue && oControl.getValue()) {
                        params[sValue] = oControl.getValue();
                    }
                });

                // Always fetch only submitted timesheets for this manager
                const ManagerID = this.getView().getModel("LoginModel").getProperty("/EmployeeID");
                await this.readSubmittedTimesheetsForManager(ManagerID);

                // Apply client-side filters
                var aAllData = this.getView().getModel("ApprovalTimesheetModel").getData();
                var aFiltered = aAllData;

                // Example: filter by EmployeeID if present
                if (params.EmployeeID) {
                    aFiltered = aFiltered.filter(function (entry) {
                        return entry.EmployeeID && entry.EmployeeID.toString().includes(params.EmployeeID);
                    });
                }
                // Update the model with filtered data
                this.getView().getModel("ApprovalTimesheetModel").setData(aFiltered);

            } catch (error) {
                MessageToast.show(this.i18nModel.getText("technicalError"));
            } finally {
                this.closeBusyDialog();
            }
        },

        TSA_onClear: function () {
            this.byId("TSA_id_Name").setValue("");
        },
        TSA_onShowComments: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("ApprovalTimesheetModel");
            var oData = oContext.getObject();
            var aComments = oData.comments || [];
            var aTimelineItems = aComments.map(function (oComment) {
                return new TimelineItem({
                    dateTime: new Date(oComment.CommentDateTime).toLocaleString(),
                    title: oComment.CommentedBy || "Anonymous",
                    text: oComment.Comment || "No comment provided",
                    userNameClickable: false,
                    icon: "sap-icon://comment"
                });
            });
            var oTimeline = new Timeline({
                showHeader: false,
                enableBusyIndicator: false,
                width: "100%",
                sortOldestFirst: true,
                enableDoubleSided: false,
                content: aTimelineItems,
                showHeaderBar: false
            });
            var oDialog = new sap.m.Dialog({
                title: this.i18nModel.getText("tCommentsTitle"),
                contentWidth: "25rem",
                contentHeight: "15rem",
                draggable: true,
                resizable: true,
                content: [oTimeline],
                endButton: new sap.m.Button({
                    text: this.i18nModel.getText("close"),
                    type: "Reject",
                    press: function () {
                        oDialog.close();
                        oDialog.destroy();
                    }
                })
            });
            oDialog.open();
        },

    });
});