sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/unified/DateRange",
    "sap/suite/ui/commons/Timeline", // Import Timeline for displaying comments
    "sap/suite/ui/commons/TimelineItem", //Import TimelineItem for individual comments
], function (BaseController, utils, JSONModel, MessageToast, DateRange, Timeline, TimelineItem) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetApproval", {
        onInit: function () {
            this.getRouter().getRoute("RouteTimesheetApproval").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            var LoginFunction = await this.commonLoginFunction("TimesheetApproval");
            if (!LoginFunction) return;
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            const sTitle = this.i18nModel.getText("headerTimesheetApproval");
            this.getView().getModel("LoginModel").setProperty("/HeaderName", sTitle);

            // Get ManagerID from LoginModel
            const ManagerID = this.getView().getModel("LoginModel").getProperty("/EmployeeID");
            const oModel = new JSONModel();
            oModel.setData({ calendarStartDate: this._getStartOfWeek(new Date()) });
            this.getView().setModel(oModel, "viewModel");
            this.TSA_onClear(); // Clear any existing filters

            this.byId("TSA_id_Status").setValue("Submitted"); //initially set Submitted

            await this.readSubmittedTimesheetsForManager(ManagerID);

            // ViewModel for button enable/disable
            const oViewModel = new JSONModel({ canApproveReject: false });
            this.getView().setModel(oViewModel, "approvalViewModel");

            // Disable buttons initially
            this.getView().getModel("approvalViewModel").setProperty("/canApproveReject", false);
            this.branch = this.getView().getModel("LoginModel").getProperty("/BranchCode");
            await this._initializeCalendarAndLegend();
        },
        //Get week satrt day
        _getStartOfWeek: function (date) {
            const day = date.getDay(); // Sunday = 0, Monday = 1, ...
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust if Sunday
            return new Date(date.setDate(diff));
        },

        //Read Timesheet for logged in manager
        readSubmittedTimesheetsForManager: async function (ManagerID) {
            this.getBusyDialog();
            try {
                const oData = await this.ajaxReadWithJQuery("Timesheet", { ManagerID: ManagerID });
                let timesheetData = Array.isArray(oData.data) ? oData.data : [oData.data];
                // Filter only specific statuses
                timesheetData = timesheetData.filter(entry =>
                    ["Submitted", "Approved", "Rejected"].includes(entry?.Status)
                );
                this._fullApprovalData = timesheetData;
                // Set main timesheet model
                this.getView().setModel(new JSONModel(timesheetData), "ApprovalTimesheetModel");
                // Unique Employee ID List 
                const uniqueEmployees = [];
                const employeeMap = new Set();
                timesheetData.forEach(entry => {
                    if (!employeeMap.has(entry.EmployeeID)) {
                        employeeMap.add(entry.EmployeeID);
                        uniqueEmployees.push({ EmployeeID: entry.EmployeeID, EmployeeName: entry.EmployeeName });
                    }
                });
                this.getView().setModel(new JSONModel(uniqueEmployees), "EmployeeFilterModel");
                this.byId("TSA_id_Status").setValue("Submitted");
                this.TSA_onSearch();
            } catch (error) {
                MessageToast.show(error.message || error.responseText);
            } finally {
                this.closeBusyDialog();
            }
        },
        //Table selection
        TSA_onSelect: function () {
            const oTable = this.byId("TSA_id_Table");
            const oSelectedItems = oTable.getSelectedItems();
            let canApproveReject = false;
            if (oSelectedItems.length > 0) {
                // Only enable if all selected items are "Submitted"
                canApproveReject = oSelectedItems.every(item =>
                    item.getBindingContext("ApprovalTimesheetModel").getProperty("Status") === "Submitted");
            }
            this.getView().getModel("approvalViewModel").setProperty("/canApproveReject", canApproveReject);
        },
        filterTimesheetForCurrentWeek: function () {
            const oViewModel = this.getView().getModel("viewModel");
            const oStartDate = new Date(oViewModel.getProperty("/calendarStartDate"));
            oStartDate.setHours(0, 0, 0, 0);

            const oCalendar = this.byId("TSA_id_calendar");
            const iDays = oCalendar?.getDays?.() || 7;

            const oEndDate = new Date(oStartDate);
            oEndDate.setDate(oEndDate.getDate() + iDays - 1);
            oEndDate.setHours(23, 59, 59, 999);

            const sSelectedStatus = this.byId("TSA_id_Status")?.getValue?.();
            const aFiltered = this._fullApprovalData.filter(entry => {
                if (!entry.Date) return false;
                const entryDate = new Date(entry.Date);
                if (isNaN(entryDate)) return false;
                entryDate.setHours(0, 0, 0, 0);

                // Filter by both date and status (if status is selected)
                const isInWeek = entryDate >= oStartDate && entryDate <= oEndDate;
                const isMatchingStatus = !sSelectedStatus || entry.Status === sSelectedStatus;
                return isInWeek && isMatchingStatus;
            });
            this.getView().setModel(new sap.ui.model.json.JSONModel(aFiltered), "ApprovalTimesheetModel");
        },
        //Calendar date selection with filtering from full dataset
        TSA_onCalendarDateSelect: function (oEvent) {
            var aSelectedDates = oEvent.getSource().getSelectedDates();
            if (aSelectedDates.length > 0) {
                var oSelectedDate = aSelectedDates[0].getStartDate();
                oSelectedDate.setHours(0, 0, 0, 0);

                // Filter from the full dataset
                if (this._fullApprovalData) {
                    var aFiltered = this._fullApprovalData.filter(function (entry) {
                        if (!entry.Date) return false;
                        var entryDate = new Date(entry.Date);
                        entryDate.setHours(0, 0, 0, 0);
                        return entryDate.getTime() === oSelectedDate.getTime();
                    });
                    this.getView().setModel(new sap.ui.model.json.JSONModel(aFiltered), "ApprovalTimesheetModel");
                } else {
                    // If somehow _fullApprovalData isn't set yet, fallback to current model data
                    const currentData = this.getView().getModel("ApprovalTimesheetModel").getData() || [];
                    var aFilteredFallback = currentData.filter(function (entry) {
                        if (!entry.Date) return false;
                        var entryDate = new Date(entry.Date);
                        entryDate.setHours(0, 0, 0, 0);
                        return entryDate.getTime() === oSelectedDate.getTime();
                    });
                    this.getView().setModel(new sap.ui.model.json.JSONModel(aFilteredFallback), "ApprovalTimesheetModel");
                }
            }
        },
        //Approve Timesheet
        TSA_onApprove: function () {
            this._openManagerRemarkDialog("Approved");
        },
        //Reject timesheet
        TSA_onReject: function () {
            this._openManagerRemarkDialog("Rejected");
        },
        //Open manager remark dialog
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
                        oOkBtn.setType(status === "Approved" ? "Emphasized" : "Emphasized");
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
                    oOkBtn.setType(status === "Approved" ? "Emphasized" : "Emphasized");
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

            // Call live change function first
            if (!this.MIF_liveChangeForMangerComments()) {
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
                        ManagerName: managerName
                    }
                };
            });
            const finalPayload = {
                comments: sRemark,
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
        MIF_liveChangeForMangerComments() {
            const input = sap.ui.getCore().byId("MIF_id_remark");
            if (!input.getValue()) {
                input.setValueStateText(this.getView().getModel('i18n').getResourceBundle().getText("commentsValueState"));
                input.setValueState("Error");
                return false;
            }
            input.setValueState("None");
            return true;
        },

        MIF_onPressClose: function () {
            if (this._oManagerRemarkDialog) {
                this._oManagerRemarkDialog.close();
            }
            //removal table selection
            this.byId("TSA_id_Table").removeSelections(true);
            sap.ui.getCore().byId("MIF_id_remark").setValue("");
            sap.ui.getCore().byId("MIF_id_remark").setValueState("None"); // Reset value state
            //disable buttons
            this.getView().getModel("approvalViewModel").setProperty("/canApproveReject", false);
            this._approvalStatus = null; // Reset approval status
        },
        //Back function
        onPressback: function () {
            this.getRouter().navTo("RouteTilePage");
            if (this._oManagerRemarkDialog) {
                this._oManagerRemarkDialog.close();
                this._oManagerRemarkDialog.destroy();
                this._oManagerRemarkDialog = null;
            }
        },
        //logout function
        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        },
        //Search call for filter values
        TSA_onSearch: async function () {
            try {
                this.getBusyDialog();
                const aFilterItems = this.byId("TSA_id_Filter").getFilterGroupItems();
                const params = {};
                let hasFilters = false;
                aFilterItems.forEach(oItem => {
                    const oControl = oItem.getControl();
                    const sValue = oItem.getName();
                    if (oControl?.getValue?.()) {
                        params[sValue] = oControl.getValue();
                        hasFilters = true;
                    }
                });

                const ManagerID = this.getView().getModel("LoginModel").getProperty("/EmployeeID");
                const data = await this.ajaxReadWithJQuery("Timesheet", { ManagerID, ...params });
                this._fullApprovalData = Array.isArray(data.data) ? data.data : [data.data];
                this.getView().setModel(new JSONModel(this._fullApprovalData), "ApprovalTimesheetModel");
                if (hasFilters) {
                    this.filterTimesheetForCurrentWeek();
                }
                this.getView().getModel("approvalViewModel").setProperty("/canApproveReject", false);
            } catch (error) {
                MessageToast.show(this.i18nModel.getText("technicalError"));
            } finally {
                this.closeBusyDialog();
            }
        },

        //Clear filterbar
        TSA_onClear: function () {
            var aFilterItems = this.byId("TSA_id_Filter").getFilterGroupItems();
            aFilterItems.forEach(function (oItem) {
                var oControl = oItem.getControl(); // Get the associated control
                if (oControl) {
                    if (oControl.setValue) {
                        oControl.setValue(""); // Clear value for ComboBox, Input, DatePicker, etc.
                    }
                    if (oControl.setSelectedKey) {
                        oControl.setSelectedKey(""); // Reset selection for dropdowns
                    }
                    if (oControl.setSelected) {
                        oControl.setSelected(false); // Reset selection for Checkboxes
                    }
                }
            });
        },
        //Show comments
        TSA_onShowComments: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("ApprovalTimesheetModel");
            var oData = oContext.getObject();
            var aComments = oData.comments || [];
            aComments.sort(function (a, b) {
                var dateA = new Date(a.CommentDateTime);
                var dateB = new Date(b.CommentDateTime);
                return dateB - dateA;
            });
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
                sortOldestFirst: false,
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
        _initializeCalendarAndLegend: async function () {
            const oCalendar = this.byId("TSA_id_calendar");
            if (oCalendar) {
                // Set the default selected date
                const oToday = new Date();
                oCalendar.removeAllSelectedDates();
                oCalendar.addSelectedDate(new DateRange({ startDate: oToday }));

                // Call the common function from the BaseController
                // It's async, so we use await
                await this.initCalendarLegend(oCalendar, this.branch);
            }
        },
    });
});