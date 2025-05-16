sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/unified/DateTypeRange",
    "sap/ui/unified/CalendarDayType",
    "sap/ui/unified/CalendarLegendItem",
    "sap/ui/core/BusyIndicator"
], function (BaseController, utils, JSONModel, MessageToast, DateTypeRange, CalendarDayType, CalendarLegendItem, BusyIndicator) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetDetails", {
        onInit: function () {
            this.getRouter().getRoute("RouteTimesheetDetails").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function () {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.branch = this.getOwnerComponent().getModel("LoginModel").getProperty("/BranchCode");
            this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
            await this._fetchCommonData("AssignedTask", "AssignModel", { EmployeeID: this.EmployeeID });
            await this._fetchCommonData("EmployeeDetails", "EmployeeModel", { EmployeeID: this.EmployeeID });
            await this._fetchCommonData("ListOfSateData", "HolidayModel", { branchCode: this.branch })
            const oViewModel = new JSONModel();
            oViewModel.setData({
                calendarStartDate: this._getStartOfWeek(new Date())
            });
            this.onMarkCalendarDates()
            this.getView().setModel(oViewModel, "viewModel");
            this.byId("TSD_id_Assignment").setValueState("None");
            this.byId("TSD_id_TimeHours").setValueState("None");
            this.byId("TSD_id_EmpComment").setValueState("None");
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
                // Step 1: Field Validations
                const isValidAssignment = utils._LCvalidateMandatoryField(this.byId("TSD_id_Assignment"), "ID");
                const isValidHours = utils._LCvalidateTimeLimit(this.byId("TSD_id_TimeHours"), "ID");
                const isValidComment = utils._LCvalidateMandatoryField(this.byId("TSD_id_EmpComment"), "ID");
                if (!(isValidAssignment && isValidHours && isValidComment)) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }
                // Step 2: Date Selection
                const oCalendar = this.getView().byId("calendar").getSelectedDates();
                const selectedDateObj = oCalendar[0]?.getStartDate();
                if (!selectedDateObj) {
                    MessageToast.show(this.i18nModel.getText("dateSelectionMissing"));
                    return;
                }
                // Step 3: Date Formatting
                const sFormattedDate = selectedDateObj.toISOString().split("T")[0]; // "2025-05-16"
                const sMonth = selectedDateObj.toLocaleString('default', { month: 'long' }); // "May"
                const sYear = selectedDateObj.getFullYear();
                const sDayOfWeek = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' }); // "Friday"
                // Step 4: Get form data
                const oModel = this.getView().getModel("EmployeeModel").getData();
                const oNewModel = this.getView().getModel("newModel");
                const oData = oNewModel ? oNewModel.getData() : {};
                const sHoursWorked = this.getView().byId("TSD_id_TimeHours").getValue();
                const sEmpComment = this.getView().byId("TSD_id_EmpComment").getValue();

                // Step 5: Prepare Payload
                const oPayload = {
                    TaskID: oData.TaskID,
                    TaskName: oData.TaskName,
                    EmployeeID: oData.EmployeeID,
                    EmployeeName: oData.EmployeeName,
                    ManagerName: oModel[0].ManagerName,
                    ManagerID: oModel[0].ManagerID,
                    HoursWorked: sHoursWorked.toString(),
                    EmployeeComments: sEmpComment,
                    Date: sFormattedDate,     // e.g. "2025-05-16"
                    Month: sMonth,            // e.g. "May"
                    Year: sYear,              // e.g. 2025
                    Day: sDayOfWeek,          // e.g. "Friday"
                    Status: "SAVED",
                    ManagerComments: oData.ManagerComments
                };
                // Step 6: Backend Call
                BusyIndicator.show(0);
                try {
                    await this.ajaxCreateWithJQuery("Timesheet", { data: oPayload });
                    MessageToast.show(this.i18nModel.getText("timesheetSuccess"));
                    this.clearTimesheetForm();
                } catch (backendErr) {
                    MessageToast.show(backendErr.message || backendErr.responseText);
                } finally {
                    BusyIndicator.hide();
                }

            } catch (err) {
                BusyIndicator.hide();
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
            this.clearTimesheetForm();
        },

        clearTimesheetForm: function () {
            const oView = this.getView();
            const oAssignModel = oView.getModel("AssignModel");
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
                // Log the data to ensure it's populated correctly
                console.log("AllData:", AllData);
                if (AllData) {
                    this.getView().getModel("AssignModel").setProperty("/selectedAssignment", AllData.TaskName);
                    this.getView().getModel("AssignModel").setProperty("/HoursWorked", AllData.HoursWorked);
                    this.getView().byId("idTextActHour").setText("Actual Hours: " + (AllData.HoursWorked || "0"));
                    const oNewModel = new JSONModel({
                        TaskID: AllData.TaskID,
                        TaskName: AllData.TaskName,
                        EmployeeID: this.EmployeeID,
                        EmployeeName: AllData.EmployeeName,
                        ManagerName: AllData.ManagerName,
                        ManagerID: AllData.ManagerID,
                        ManagerComments: AllData.ManagerComments || ""
                    });
                    this.getView().setModel(oNewModel, "newModel");
                } else {
                    console.warn("No data found for selected item.");
                }
            } else {
                console.warn("No selected item.");
            }
        },

    });
});