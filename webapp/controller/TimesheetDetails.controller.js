sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/unified/DateTypeRange",
    "sap/ui/unified/CalendarDayType",
    "sap/ui/unified/CalendarLegendItem",
], function (BaseController, utils, JSONModel, MessageToast, DateTypeRange, CalendarDayType, CalendarLegendItem) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetDetails", {
        onInit: function () {
            this.getRouter().getRoute("RouteTimesheetDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
            var LoginFunction = await this.commonLoginFunction("Timesheet");
            if (!LoginFunction) return;
            this.getBusyDialog();
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.branch = this.getOwnerComponent().getModel("LoginModel").getProperty("/BranchCode");
            this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
            await this._fetchCommonData("AssignedTask", "AssignModel", { EmployeeID: this.EmployeeID });
            await this._fetchCommonData("ListOfSateData", "HolidayModel", { branchCode: this.branch });
            const oViewModel = new JSONModel({ isUpdate: false, isCreate: true, isSubmitted: false, isEditing: true, calendarStartDate: this._getStartOfWeek(new Date()), isCalendarEnabled: true, formTitle: "", pageTitle: "" });
            this.getView().setModel(oViewModel, "viewModel");
            this.byId("TSD_id_Assignment").setValueState("None");
            this.byId("TSD_id_TimeHours").setValueState("None");
            this.byId("TSD_id_EmpComment").setValueState("None");
            this._makeDatePickersReadOnly(["TSD_id_Assignment", "TSD_id_TimeHours"]);
            // Set current date as selected in the calendar
            var oCalendar = this.byId("calendar");
            if (oCalendar) {
                var oToday = new Date();
                var oDateRange = new sap.ui.unified.DateRange({ startDate: oToday });
                oCalendar.removeAllSelectedDates();
                oCalendar.addSelectedDate(oDateRange);
                this.onInitializeLegend({ getSource: () => oCalendar });
                this.onDateSelect({ getSource: () => oCalendar });
            }

            // Handle Edit and Create cases
            this.sArg = oEvent.getParameter("arguments").sPath;

            if (this.sArg !== "Timesheet") {
                await this.readCallTimesheet();
                const oData = this.getView().getModel("newModel").getData();
                this.getView().getModel("newModel").setProperty("/Comment", oData.comments[oData.comments.length - 1].Comment);

                const isSubmitted = oData.Status === "Submitted" || oData.Status === "Approved";
                oViewModel.setProperty("/isUpdate", !isSubmitted); // hide edit button if submitted
                // oViewModel.setProperty("/isUpdate", true);
                oViewModel.setProperty("/isCreate", false);
                oViewModel.setProperty("/isEditing", false); // Start in view mode for edit
                oViewModel.setProperty("/isCalendarEnabled", false);
                oViewModel.setProperty("/pageTitle", "Edit Timesheet Entry");
                var editDate = this.getView().getModel("newModel").getProperty("/Date");
                if (editDate) {
                    if (editDate.includes("T")) {
                        editDate = editDate.split("T")[0];
                    }
                    var parts = editDate.split("-");
                    if (parts.length === 3) {
                        editDate = parts[2] + "/" + parts[1] + "/" + parts[0];
                    }
                }
                oViewModel.setProperty("/formTitle", "Edit data for " + editDate);
            } else {
                oViewModel.setProperty("/isUpdate", false);
                oViewModel.setProperty("/isCreate", true);
                oViewModel.setProperty("/isEditing", true);
                oViewModel.setProperty("/isCalendarEnabled", true);
                oViewModel.setProperty("/pageTitle", "Create Timesheet Entry");
                var today = new Date();
                var todayStr = String(today.getDate()).padStart(2, '0') + "/" +
                    String(today.getMonth() + 1).padStart(2, '0') + "/" +
                    today.getFullYear();
                oViewModel.setProperty("/formTitle", "Create entry for " + todayStr);
                // Set empty newModel for create
                const emptyData = {
                    TaskID: "",
                    TaskName: "",
                    HoursWorked: "",
                    ActualHours: "",
                    EmployeeID: this.EmployeeID,
                    EmployeeName: "",
                    ManagerName: "",
                    ManagerID: "",
                    Comment: ""
                };
                this.getView().setModel(new sap.ui.model.json.JSONModel(emptyData), "newModel");
                if (this.getView().getModel("editModel")) {
                    this.getView().getModel("editModel").setProperty("/editableBut", true);
                }
            }
            this.closeBusyDialog();
        },
        readCallTimesheet: async function () {
            try {
                this.getBusyDialog();
                await this.ajaxReadWithJQuery("Timesheet", { EmployeeID: this.EmployeeID }).then((oData) => {
                    var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];

                    // Find the selected row using sPath (SrNo)
                    var selectedEntry = offerData.find(entry => entry.SrNo === this.sArg);
                    if (selectedEntry) {
                        this.getView().setModel(new JSONModel(selectedEntry), "newModel");
                    }
                    this.closeBusyDialog();

                }).catch((error) => {
                    MessageToast.show(error.message || error.responseText);
                    this.closeBusyDialog();

                });
            } catch (error) {
                MessageToast.show(this.i18nModel.getText("technicalError"));
                this.closeBusyDialog();
            }
        },

        onLogout: function () {
            this.CommonLogoutFunction();
        },

        _getStartOfWeek: function (date) {
            const day = date.getDay(); // Sunday = 0, Monday = 1, ...
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust if Sunday
            return new Date(date.setDate(diff));
        },

        TD_ValidateCommonFields: function (oEvent) {
            utils._LCvalidateMandatoryField(oEvent);
        },

        TSD_onPressBack: function () {
            this.getRouter().navTo("RouteTimesheet");
        },
        TD_ValidateTime: function (oEvent) {
            utils._LCvalidateTimeLimit(oEvent);
        },

        onValueHelpRequest: function () {
            const oCalendar = this.getView().byId("calendar");
            const selectedDates = oCalendar ? oCalendar.getSelectedDates() : [];
            const selectedDateObj = selectedDates[0]?.getStartDate();

            if (!selectedDateObj) {
                MessageToast.show(this.i18nModel.getText("selectDateT") || "Please select a date first.");
                return;
            }

            // Normalize selected date
            const selectedDate = new Date(
                selectedDateObj.getFullYear(),
                selectedDateObj.getMonth(),
                selectedDateObj.getDate()
            );

            // Get full assignment data
            const oAssignModel = this.getView().getModel("AssignModel");
            const aAllAssignments = oAssignModel?.getData() || [];

            // Filter based on selected date falling within start and end date
            const aFilteredAssignments = aAllAssignments.filter(oItem => {
                if (!oItem.StartDate || !oItem.EndDate) return false;

                const startDate = new Date(oItem.StartDate);
                const endDate = new Date(oItem.EndDate);

                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                return selectedDate >= startDate && selectedDate <= endDate;
            });

            // Set filtered data into a dedicated model
            const oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredAssignments);
            this.getView().setModel(oFilteredModel, "FilteredAssignModel");

            // Open dialog
            if (!this.TSD_oDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.TimesheetTask",
                    controller: this
                }).then(function (oDialog) {
                    this.TSD_oDialog = oDialog;
                    this.getView().addDependent(this.TSD_oDialog);
                    this.TSD_oDialog.open();
                }.bind(this));
            } else {
                this.TSD_oDialog.open();
            }
        },
        onAssignmentLiveChange: function (oEvent) {
            const sQuery = oEvent.getParameter("value").toLowerCase(); // get input string
            const oBinding = oEvent.getSource().getBinding("items");

            const oFilter1 = new sap.ui.model.Filter("TaskName", sap.ui.model.FilterOperator.Contains, sQuery);
            const oFilter2 = new sap.ui.model.Filter("TaskID", sap.ui.model.FilterOperator.Contains, sQuery);

            const oCombinedFilter = new sap.ui.model.Filter([oFilter1, oFilter2], false); // OR logic
            oBinding.filter(oCombinedFilter);
        },

        TSD_onSubmit: async function () {
            try {
                if (!this._validateTimesheetFields(true)) return;

                const oCalendar = this.byId("calendar").getSelectedDates();
                const selectedDateObj = oCalendar[0]?.getStartDate();
                if (!selectedDateObj) {
                    MessageToast.show("Please select a date.");
                    return;
                }

                const formattedDate = [
                    selectedDateObj.getFullYear(),
                    String(selectedDateObj.getMonth() + 1).padStart(2, '0'),
                    String(selectedDateObj.getDate()).padStart(2, '0')
                ].join('-');

                const oData = this.getView().getModel("newModel")?.getData() || {};
                const oPayload = {
                    TaskID: oData.TaskID,
                    TaskName: oData.TaskName,
                    EmployeeID: oData.EmployeeID,
                    EmployeeName: oData.EmployeeName,
                    ManagerName: oData.ManagerName,
                    ManagerID: oData.ManagerID,
                    HoursWorked: Number(this.byId("TSD_id_TimeHours").getValue()).toString(),
                    Date: formattedDate,
                    Month: selectedDateObj.toLocaleString('default', { month: 'long' }),
                    Year: selectedDateObj.getFullYear(),
                    Day: selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
                    Status: "Saved",
                    comments: oData.Comment
                };

                this.getBusyDialog();
                await this.ajaxCreateWithJQuery("Timesheet", { data: oPayload });
                MessageToast.show(this.i18nModel.getText("timesheetSuccess") || "Timesheet submitted!");
                this.clearTimesheetForm();
            } catch (err) {
                MessageToast.show(err.message || "Submission error.");
            } finally {
                this.closeBusyDialog();
            }
        },
        // Initialize calendar legend
        onMarkCalendarDates: function () {
            var that = this;
            this.oDatePicker.removeAllSpecialDates();
            var holidays = that.getView().getModel("HolidayModel").getData();
            var holidayMap = new Map(holidays.map(function (holiday) {
                return [new Date(holiday.Date).toDateString(), holiday.Name];
            }));
            var yearStart = new Date(new Date().getFullYear(), 0, 1);
            var yearEnd = new Date(new Date().getFullYear(), 11, 31);
            var today = new Date();
            for (var d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
                var day = d.getDay();
                var isWeekend = (day === 0 || day === 6);
                var holidayName = holidayMap.get(d.toDateString());
                var isFutureDate = d > today;
                var dateRange = new sap.ui.unified.DateTypeRange({
                    startDate: new Date(d),
                    endDate: new Date(d)
                });
                if (holidayName) {
                    dateRange.setType("Type04");
                    dateRange.setTooltip("Holiday : " + holidayName);
                } else if (isWeekend) {
                    dateRange.setType("Type09");
                    dateRange.setTooltip("Weekend");
                } else if (isFutureDate) {
                    dateRange.setType("Type07");
                    dateRange.setTooltip("Future Date");
                } else {
                    dateRange.setType("Type06");
                    dateRange.setTooltip("Working Day");
                }
                this.oDatePicker.addSpecialDate(dateRange);
            }
        },

        // Initialize calendar legend with new "Future Date" type
        onInitializeLegend: function (oEvent) {
            this.oDatePicker = oEvent.getSource();
            if (this.oDatePicker) {
                var oLegend = new sap.ui.unified.CalendarLegend({
                    items: [
                        new sap.ui.unified.CalendarLegendItem({ type: "Type04", text: "Holiday" }),
                        new sap.ui.unified.CalendarLegendItem({ type: "Type09", text: "Weekend" }),
                        new sap.ui.unified.CalendarLegendItem({ type: "Type06", text: "Working Day" }),
                        new sap.ui.unified.CalendarLegendItem({ type: "Type07", text: "Future Date" })
                    ]
                });
                this.oDatePicker.setLegend(oLegend);
                this.onMarkCalendarDates();
            }
        },

        onDateSelect: function (oEvent) {
            var that = this;
            var oViewModel = this.getView().getModel("viewModel");
            if (!oViewModel.getProperty("/isCalendarEnabled")) {
                return;
            }
            var selectedDates = oEvent.getSource().getSelectedDates();
            this.byId("TSD_id_Assignment").setValue("");
            this.byId("TSD_id_TimeHours").setValue("");
            this.byId("TSD_id_EmpComment").setValue("");
            this.byId("idTextActHour").setText("");
            if (selectedDates.length > 0) {
                var selectedDate = selectedDates[0].getStartDate();
                var formattedDate = that.Formatter.formatDate(selectedDate);
                var today = new Date();
                // Store raw selected date for use in assignment duplicate check
                this.getView().getModel("AssignModel").setProperty("/selectedDate", selectedDate);
                // Get holiday data
                var holidays = that.getView().getModel("HolidayModel").getData();
                var holidayMap = new Map(holidays.map(holiday => [new Date(holiday.Date).toDateString(), holiday.Name]));
                var day = selectedDate.getDay();
                var isWeekend = (day === 0 || day === 6);
                var isHoliday = holidayMap.has(selectedDate.toDateString());
                // Prevent future date selection
                if (selectedDate > today) {
                    sap.m.MessageBox.error("You cannot fill a timesheet for a future date.");
                    return;
                }
                // Show warning for holiday or weekend
                if (isWeekend || isHoliday) {
                    sap.m.MessageBox.warning("Are you sure you want to fill a timesheet on a non-working day?");
                }
                // Update the SimpleForm title
                var oSimpleForm = that.getView().byId("SimpleFormToolbar");
                if (oSimpleForm) {
                    oSimpleForm.setTitle("Create entry for " + formattedDate);
                }
                // Update view model
                var oViewModel = that.getView().getModel("viewModel");
                oViewModel.setProperty("/selectedEntryDate", formattedDate);
            }
        },

        clearTimesheetForm: function () {
            const oAssignModel = this.getView().getModel("AssignModel");
            // Clear input values
            oAssignModel.setProperty("/selectedAssignment", "");
            oAssignModel.setProperty("/HoursWorked", "");
            oAssignModel.setProperty("/HoursWorked", "");
            // Clear UI controls manually if needed
            this.byId("TSD_id_Assignment").setValue("");
            this.byId("TSD_id_TimeHours").setValue("");
            this.byId("TSD_id_EmpComment").setValue("");
            this.byId("idTextActHour").setText("");
            // Clear value state errors if any
            this.byId("TSD_id_Assignment").setValueState("None");
            this.byId("TSD_id_TimeHours").setValueState("None");
            this.byId("TSD_id_EmpComment").setValueState("None");
            this.getView().setModel(new JSONModel({}), "newModel");
        },


        onValueHelpDialogClose: async function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                console.warn("No selected item.");
                return;
            }
            const AllData = oSelectedItem.getBindingContext("AssignModel").getObject();
            if (!AllData) {
                console.warn("No data found for selected item.");
                return;
            }
            const selectedDate = this.getView().getModel("AssignModel").getProperty("/selectedDate");
            if (!selectedDate) {
                MessageToast.show("Please select a date before choosing an assignment.");
                return;
            }
            // Format selected date to 'YYYY-MM-DD'
            const formattedDate = [selectedDate.getFullYear(), String(selectedDate.getMonth() + 1).padStart(2, '0'), String(selectedDate.getDate()).padStart(2, '0')].join('-');
            this.getBusyDialog();
            try {
                // Fetch all timesheet entries for this employee
                const checkDup = await this.ajaxReadWithJQuery("Timesheet", {
                    EmployeeID: this.EmployeeID
                });
                // Check if any entry matches the selected TaskID AND the selected Date
                const isDuplicate = Array.isArray(checkDup.data) && checkDup.data.some(entry => {
                    if (!entry.Date || !entry.TaskID) return false;
                    const entryDateObj = new Date(entry.Date);
                    const entryDateOnly = [entryDateObj.getFullYear(), String(entryDateObj.getMonth() + 1).padStart(2, '0'), String(entryDateObj.getDate()).padStart(2, '0')].join('-');
                    return entry.TaskID === AllData.TaskID && entryDateOnly === formattedDate;
                });
                if (isDuplicate) {
                    MessageToast.show("This assignment already exists for the selected date.");
                    this.closeBusyDialog();
                    return;
                }
                // Show actual hours in the UI
                this.getView().getModel("AssignModel").setProperty("/selectedAssignment", AllData.TaskName);
                this.getView().getModel("AssignModel").setProperty("/HoursWorked", AllData.HoursWorked);
                this.getView().byId("idTextActHour").setText("Actual Hours: " + (AllData.HoursWorked || "0"));

                // Merge with existing newModel data
                const oNewModelData = this.getView().getModel("newModel")?.getData() || {};
                oNewModelData.TaskID = AllData.TaskID;
                oNewModelData.TaskName = AllData.TaskName;
                oNewModelData.HoursWorked = AllData.HoursWorked;
                oNewModelData.ActualHours = AllData.HoursWorked;
                oNewModelData.EmployeeID = this.EmployeeID;
                oNewModelData.EmployeeName = AllData.EmployeeName;
                oNewModelData.ManagerName = AllData.ManagerName;
                oNewModelData.ManagerID = AllData.ManagerID;
                oNewModelData.Date = formattedDate;
                this.getView().getModel("newModel").setData(oNewModelData);

            } catch (err) {
                MessageToast.show(err.message || "Error checking assignment.");
            } finally {
                this.closeBusyDialog();
            }
        },
        TSD_onToggleEdit: async function () {
            const oViewModel = this.getView().getModel("viewModel");

            if (oViewModel.getProperty("/isEditing")) {
                // Don't proceed with update if validation fails
                if (!this._validateTimesheetFields(false)) {
                    return;
                }
                await this.TSD_onUpdate();
                oViewModel.setProperty("/isEditing", false);
            } else {
                oViewModel.setProperty("/isEditing", true);

                // Get ActualHours from AssignModel
                const oAssignData = this.getView().getModel("AssignModel")?.getData() || [];
                const oModelData = this.getView().getModel("newModel")?.getData() || {};
                const match = oAssignData.find(a => a.TaskID === oModelData.TaskID);
                const hrs = match?.HoursWorked;

                this.getView().getModel("newModel").setProperty("/ActualHours", hrs || 0);
                const hoursText = hrs ? `${hrs} hours` : "Not available";
                this.byId("idTextActHour").setText(`Actual Hours: ${hoursText}`);

                // Focus on the hours input field for quick editing
                this.byId("TSD_id_TimeHours").focus();
            }
        },
        TSD_onUpdate: async function () {
            try {
                this.getBusyDialog();
                if (!this._validateTimesheetFields(false)) {
                    this.closeBusyDialog();
                    return;
                }
                let oData = this.getView().getModel("newModel").getData();
                delete oData.comments;

                const oPayload = {
                    data: oData,
                    filters: { SrNo: this.sArg }
                };

                await this.ajaxUpdateWithJQuery("Timesheet", oPayload);
                MessageToast.show(this.i18nModel.getText("updateSuccess") || "Update successful.");

                const oViewModel = this.getView().getModel("viewModel");
                oViewModel.setProperty("/isEditing", false);
                oViewModel.setProperty("/isEditMode", true);
                oViewModel.setProperty("/editable", false);
                oViewModel.setProperty("/isVisiable", true);
                oViewModel.setProperty("/editBut", true);
                this.getView().getModel("newModel").refresh(true);

            } catch (err) {
                MessageToast.show(err.message || this.i18nModel.getText("technicalError") || "Update failed.");
            } finally {
                this.closeBusyDialog();
            }
        },
        _validateTimesheetFields: function (isCreateMode = true) {
            const oComment = this.byId("TSD_id_EmpComment");
            const oHours = this.byId("TSD_id_TimeHours");
            const oAssignment = this.byId("TSD_id_Assignment");
            const oData = this.getView().getModel("newModel")?.getData() || {};
            const aAssigns = this.getView().getModel("AssignModel")?.getData() || [];

            // Basic field validation
            if (!utils._LCvalidateMandatoryField(oAssignment, "ID")) return false;
            if (!utils._LCvalidateTimeLimit(oHours, "ID")) return false;
            if (!utils._LCvalidateMandatoryField(oComment, "ID")) return false;

            const sEnteredHours = Number(oHours.getValue());
            let sActualHours = Number(oData.ActualHours);

            // Fallback if ActualHours not populated
            if (!sActualHours || sActualHours === 0) {
                const match = aAssigns.find(a => a.TaskID === oData.TaskID);
                sActualHours = Number(match?.HoursWorked || 0);
                this.getView().getModel("newModel").setProperty("/ActualHours", sActualHours);
            }

            if (isNaN(sEnteredHours) || isNaN(sActualHours)) {
                MessageToast.show("Invalid hour value.");
                return false;
            }

            if (sEnteredHours > sActualHours) {
                const errorMsg = this.i18nModel.getText("hoursExceedError") || `Entered hours (${sEnteredHours}) cannot exceed assigned hours (${sActualHours}).`;
                MessageToast.show(errorMsg);
                oHours.setValueState("Error");
                oHours.setValueStateText(errorMsg);
                return false;
            }
            oHours.setValueState("None");
            return true;
        }
    });
});