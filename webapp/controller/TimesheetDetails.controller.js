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
            await this._fetchCommonData("EmployeeDetails", "EmployeeModel", { EmployeeID: this.EmployeeID });
            await this._fetchCommonData("ListOfSateData", "HolidayModel", { branchCode: this.branch });
            const oViewModel = new JSONModel({ isUpdate: false, isCreate: true, isSubmitted: false, isEditing: false, calendarStartDate: this._getStartOfWeek(new Date()) });
            this.getView().setModel(oViewModel, "viewModel");
            this.byId("TSD_id_Assignment").setValueState("None");
            this.byId("TSD_id_TimeHours").setValueState("None");
            this.byId("TSD_id_EmpComment").setValueState("None");
            this._makeDatePickersReadOnly(["TSD_id_Assignment", "TSD_id_TimeHours"]);

            // Handle Edit and Create cases
            this.sArg = oEvent.getParameter("arguments").sPath;

            if (this.sArg !== "Timesheet") {
                await this.readCallTimesheet();
                // Edit Case
                oViewModel.setProperty("/isUpdate", true);
                oViewModel.setProperty("/isCreate", false);
                oViewModel.setProperty("/isEditing", false);
            } else {
                // Create Case
                oViewModel.setProperty("/isUpdate", false);
                oViewModel.setProperty("/isCreate", true);
                oViewModel.setProperty("/isEditing", true);
                // Set empty newModel for create
                const emptyData = {
                    TaskID: "",
                    TaskName: "",
                    HoursWorked: "",
                    EmployeeComments: "",
                    ActualHours: "",
                    EmployeeID: this.EmployeeID,
                    EmployeeName: "",
                    ManagerName: "",
                    ManagerID: "",
                    ManagerComments: ""
                };
                this.getView().setModel(new sap.ui.model.json.JSONModel(emptyData), "newModel");
                if (this.getView().getModel("editModel")) {
                    this.getView().getModel("editModel").setProperty("/editableBut", true);
                }
            }
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
            // Validate that a date is selected before opening the dialog
            const oCalendar = this.getView().byId("calendar");
            const selectedDates = oCalendar ? oCalendar.getSelectedDates() : [];
            const selectedDateObj = selectedDates[0]?.getStartDate();

            if (!selectedDateObj) {
                MessageToast.show(this.i18nModel.getText("selectDateT") || "Please select a date first.");
                return;
            }

            if (!this.TSD_oDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.TimesheetTask",
                    controller: this,
                }).then(function (TSD_oDialog) {
                    this.TSD_oDialog = TSD_oDialog;
                    this.getView().addDependent(this.TSD_oDialog);
                    this.TSD_oDialog.open();
                }.bind(this));
            } else {
                this.TSD_oDialog.open();
            }
        },
        TSD_onSubmit: async function () {
            try {
                // Step 1: Validate mandatory fields
                const isValid = (
                    utils._LCvalidateMandatoryField(this.byId("TSD_id_Assignment"), "ID") &&
                    utils._LCvalidateTimeLimit(this.byId("TSD_id_TimeHours"), "ID") &&
                    utils._LCvalidateMandatoryField(this.byId("TSD_id_EmpComment"), "ID")
                );
                if (!isValid) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }

                // Step 2: Validate date selected
                const oCalendar = this.getView().byId("calendar").getSelectedDates();
                const selectedDateObj = oCalendar[0]?.getStartDate();
                if (!selectedDateObj) {
                    MessageToast.show(this.i18nModel.getText("selectDateT"));
                    return;
                }
                // Step 3: Get entered and actual hours
                const sEnteredHours = Number(this.byId("TSD_id_TimeHours").getValue());
                const oData = this.getView().getModel("newModel")?.getData() || {};
                const sActualHours = Number(oData?.ActualHours);
                if (isNaN(sEnteredHours) || isNaN(sActualHours)) {
                    MessageToast.show("Invalid hour value.");
                    return;
                }
                if (sEnteredHours > sActualHours) {
                    MessageToast.show(this.i18nModel.getText("hoursExceedError") || "Entered hours cannot exceed actual assignment hours.");
                    return;
                }

                // Step 4: Duplicate check (backend)
                const selectedDateStr = selectedDateObj.toISOString().split("T")[0];
                const taskId = oData.TaskID;
                const employeeId = oData.EmployeeID;

                this.getBusyDialog();
                try {
                    // Make a backend call to check for duplicate
                    const duplicate = await this.ajaxReadWithJQuery("Timesheet", {
                        EmployeeID: employeeId,
                        TaskID: taskId,
                        Date: selectedDateStr
                    });

                    // If backend returns any data, it's a duplicate
                    if (duplicate.data && (
                        (Array.isArray(duplicate.data) && duplicate.data.length > 0) ||
                        (!Array.isArray(duplicate.data) && Object.keys(duplicate.data).length > 0)
                    )) {
                        this.closeBusyDialog();
                        MessageToast.show("You have already filled this assignment for the selected date.");
                        return;
                    }

                    // Step 5: Prepare payload
                    const oPayload = {
                        TaskID: oData.TaskID,
                        TaskName: oData.TaskName,
                        EmployeeID: oData.EmployeeID,
                        EmployeeName: oData.EmployeeName,
                        ManagerName: oData.ManagerName || "Unknown",
                        ManagerID: oData.ManagerID || "Unknown",
                        HoursWorked: sEnteredHours.toString(),
                        EmployeeComments: this.byId("TSD_id_EmpComment").getValue(),
                        Date: selectedDateStr,
                        Month: selectedDateObj.toLocaleString('default', { month: 'long' }),
                        Year: selectedDateObj.getFullYear(),
                        Day: selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
                        Status: "Saved",
                        ManagerComments: oData.ManagerComments || ""
                    };

                    // Step 6: Submit to backend
                    await this.ajaxCreateWithJQuery("Timesheet", { data: oPayload });
                    MessageToast.show(this.i18nModel.getText("timesheetSuccess"));
                    this.clearTimesheetForm();
                } catch (backendErr) {
                    this.closeBusyDialog();
                    MessageToast.show(backendErr.message || backendErr.responseText);
                } finally {
                    this.closeBusyDialog();
                }
            } catch (err) {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
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
            var selectedDates = oEvent.getSource().getSelectedDates();
            this.byId("TSD_id_Assignment").setValue("");
            this.byId("TSD_id_TimeHours").setValue("");
            this.byId("TSD_id_EmpComment").setValue("");
            this.byId("idTextActHour").setText("");
            if (selectedDates.length > 0) {
                var selectedDate = selectedDates[0].getStartDate();
                var formattedDate = that.Formatter.formatDate(selectedDate);
                var today = new Date();
                // Get holiday data
                var holidays = that.getView().getModel("HolidayModel").getData();
                var holidayMap = new Map(holidays.map(holiday => [new Date(holiday.Date).toDateString(), holiday.Name])); var day = selectedDate.getDay();
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


        onValueHelpDialogClose: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                const AllData = oSelectedItem.getBindingContext("AssignModel").getObject();
                if (AllData) {
                    // Show actual hours in the UI
                    this.getView().getModel("AssignModel").setProperty("/selectedAssignment", AllData.TaskName);
                    this.getView().getModel("AssignModel").setProperty("/HoursWorked", AllData.HoursWorked);
                    this.getView().byId("idTextActHour").setText("Actual Hours: " + (AllData.HoursWorked || "0"));

                    // Merge with existing newModel data (preserve comments, etc.)
                    var oNewModelData = this.getView().getModel("newModel")?.getData() || {};
                    oNewModelData.TaskID = AllData.TaskID;
                    oNewModelData.TaskName = AllData.TaskName;
                    oNewModelData.HoursWorked = AllData.HoursWorked;
                    oNewModelData.ActualHours = AllData.HoursWorked;
                    oNewModelData.EmployeeID = this.EmployeeID;
                    oNewModelData.EmployeeName = AllData.EmployeeName;
                    oNewModelData.ManagerName = AllData.ManagerName;
                    oNewModelData.ManagerID = AllData.ManagerID;
                    oNewModelData.ManagerComments = AllData.ManagerComments || "";

                    this.getView().getModel("newModel").setData(oNewModelData);
                } else {
                    console.warn("No data found for selected item.");
                }
            } else {
                console.warn("No selected item.");
            }
        },
        TSD_onToggleEdit: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var isEditing = oViewModel.getProperty("/isEditing");
            if (isEditing) {
                // Save action (handle update logic)
                this.TSD_onUpdate();
            }
            // Toggle editing mode
            oViewModel.setProperty("/isEditing", !isEditing);
        },
        TSD_onUpdate: async function () {
            try {
                this.getBusyDialog();
                var oViewModel = this.getView().getModel("viewModel");
                var oModel = this.getView().getModel("newModel").getData();
                oModel = {
                    "data": oModel,
                    "filters": {
                        "SrNo": this.sArg
                    }
                };
                // AJAX call for updating the data
                await this.ajaxUpdateWithJQuery("Timesheet", oModel).then((oData) => {
                    if (oData.success) {
                        this.closeBusyDialog();
                        oViewModel.setProperty("/editable", false);
                        oViewModel.setProperty("/isEditMode", true);
                        oViewModel.setProperty("/isVisiable", true);
                        oViewModel.setProperty("editBut", true);
                        this.getView().getModel("newModel").refresh(true);
                    }
                }).catch((error) => {
                    this.closeBusyDialog();
                    MessageToast.show(error.message || error.responseText);
                });
            } catch (error) {
                this.closeBusyDialog();
                MessageToast.show(this.i18nModel.getText("technicalError"));
            }
        },


    });
});