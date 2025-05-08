sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/unified/DateTypeRange",
    "sap/ui/unified/CalendarDayType",
    "sap/ui/unified/CalendarLegendItem",
    "sap/ui/core/BusyIndicator"
], function (
    BaseController,
    utils,
    JSONModel,
    MessageToast,
    DateTypeRange,
    CalendarDayType,
    CalendarLegendItem,
    BusyIndicator
) {
    "use strict";



    return BaseController.extend("sap.kt.com.minihrsolution.controller.TimesheetDetails", {
        onInit: function () {
            this.getRouter().getRoute("RouteTimesheetDetails").attachMatched(this._onRouteMatched, this);
        },


        _onRouteMatched: async function () {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
            await this._fetchCommonData("AssignedTask", "AssignModel", { EmployeeID: this.EmployeeID });
            await this._fetchCommonData("EmployeeDetails", "EmployeeModel",{ EmployeeID: this.EmployeeID });
            const oViewModel = new JSONModel();
            oViewModel.setData({
                calendarStartDate: this._getStartOfWeek(new Date())
            });
            this.getView().setModel(oViewModel, "viewModel");
            this.onInitializeCalendarLegend();
        },
        

      

        _onRouteMatched: async function () {
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
            this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
            await this._fetchCommonData("AssignedTask", "AssignModel", { EmployeeID: this.EmployeeID });
            await this._fetchCommonData("EmployeeDetails", "EmployeeModel",{ EmployeeID: this.EmployeeID });
            const oViewModel = new JSONModel();
            oViewModel.setData({
                calendarStartDate: this._getStartOfWeek(new Date())
            });
            this.getView().setModel(oViewModel, "viewModel");
            this.onInitializeCalendarLegend();
        },

        onAfterRendering: function () {
            // Ensure holidays are marked after rendering
            this._markHolidaysOnCalendar();
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
                const isValidHours = utils._LCvalidateMandatoryField(this.byId("TSD_id_TimeHours"), "ID");
                const isValidComment = utils._LCvalidateMandatoryField(this.byId("TSD_id_EmpComment"), "ID");
                const isHourLimitValid = this.validateWorkingHours();
        
                if (!(isValidAssignment && isValidHours && isValidComment && isHourLimitValid)) {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                    return;
                }
        
                // Step 2: Date Selection
                const oCalendar = this.getView().byId("calendar");
                const aSelectedDates = oCalendar.getSelectedDates();
                const sSelectedDate = aSelectedDates.length > 0 ? aSelectedDates[0].getStartDate() : null;
        
                if (!sSelectedDate && this.sArg === "Timesheet") {
                    MessageToast.show(this.i18nModel.getText("dateSelect"));
                    return;
                }
        
                const oSelectedDate = new Date(sSelectedDate);
                if (isNaN(oSelectedDate)) {
                    MessageToast.show("Invalid date selected");
                    return;
                }
        
                // Step 3: Format Date
                const sFormattedDate = oSelectedDate.getDate().toString().padStart(2, '0') + "/" +
                    (oSelectedDate.getMonth() + 1).toString().padStart(2, '0') + "/" +
                    oSelectedDate.getFullYear().toString();
        
                const sMonth = oSelectedDate.toLocaleString('default', { month: 'long' });
                const sYear = oSelectedDate.getFullYear().toString();
                const sDayOfWeek = oSelectedDate.toLocaleString('default', { weekday: 'long' });

               const oEditModel = this.getOwnerComponent().getModel("EditTimesheetModel");
               const isEdit = oEditModel && oEditModel.getData() && oEditModel.getData().TimesheetID
                
                var oModel = this.getView().getModel("EmployeeModel").getData();
                const oNewModel = this.getView().getModel("newModel");
                const oData = oNewModel ? oNewModel.getData() : {};
                const oPayload = {
                    TaskID: oData.TaskID,
                    TaskName: oData.TaskName,
                    EmployeeID: oData.EmployeeID,
                    EmployeeName: oData.EmployeeName,
                    ManagerName: oModel[0].ManagerName,   
                    ManagerID:oModel[0].ManagerID,
                    HoursWorked: this.getView().byId("TSD_id_TimeHours").getValue().toString(),
                    EmployeeComments: this.getView().byId("TSD_id_EmpComment").getValue(),
                    Date: sFormattedDate,
                    Month: sMonth,
                    Year: sYear,
                    Day: sDayOfWeek,
                    Status: "SAVED",
                    ManagerComments: oData.ManagerComments
                };
        
                // Step 6: Common Backend Call
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
                console.error("Submission Error:", err);
            }
        },

        ajaxUpdateWithJQuery: function (sEndpoint, oPayload) {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: `/backend/${sEndpoint}`, // Adjust this path
                    method: "PUT", // or PATCH based on backend
                    contentType: "application/json",
                    data: JSON.stringify(oPayload),
                    success: resolve,
                    error: reject
                });
            });
        },
        

        
        


        clearTimesheetForm: function () {
            const oView = this.getView();
            const oAssignModel = oView.getModel("AssignModel");
        
            // Clear input values
            oAssignModel.setProperty("/selectedAssignment", "");
            oAssignModel.setProperty("/HoursWorked", 0);
            oAssignModel.setProperty("/EnteredHours", "");
        
            // Clear UI controls manually if needed
            this.byId("TSD_id_Assignment").setValue("");
            this.byId("TSD_id_TimeHours").setValue("");
            this.byId("TSD_id_EmpComment").setValue("");
        
            // Clear value state errors if any
            this.byId("TSD_id_Assignment").setValueState(sap.ui.core.ValueState.None);
            this.byId("TSD_id_TimeHours").setValueState(sap.ui.core.ValueState.None);
            this.byId("TSD_id_EmpComment").setValueState(sap.ui.core.ValueState.None);

            this.getView().setModel(new JSONModel({}), "newModel");
        },
        
        
       
        
        
        onInitializeCalendarLegend: function () {
            this._ensureCalendarLegend();
        },

        _ensureCalendarLegend: function () {
            let oLegend = this.byId("calendarLegend");
            if (!oLegend) {
                oLegend = new sap.ui.unified.CalendarLegend({
                    id: this.getView().createId("calendarLegend"),
                    items: [
                        new CalendarLegendItem({
                            type: CalendarDayType.Type10,
                            text: "Holiday"
                        })
                    ]
                });
                this.getView().addDependent(oLegend);
            }

            const oCalendar = this.byId("calendar");
            if (oCalendar) {
                oCalendar.setLegend(oLegend);
            }
        },

        _markHolidaysOnCalendar: async function () {
            try {
                const oCalendar = this.byId("calendar");
                if (!oCalendar) return;

                oCalendar.removeAllSpecialDates();

                const currentYear = new Date().getFullYear();
                const result = await this.ajaxReadWithJQuery("ListOfHolidays", {
                    startDate: `${currentYear}-01-01`,
                    endDate: `${currentYear}-12-31`
                });

                const holidays = result?.data || [];

                holidays.forEach(holiday => {
                    const date = new Date(holiday.Date);
                    date.setHours(0, 0, 0, 0);

                    const specialDate = new DateTypeRange({
                        startDate: date,
                        type: CalendarDayType.Type10,
                        tooltip: `${holiday.Name} (${holiday.Day})`
                    });

                    oCalendar.addSpecialDate(specialDate);
                });
            } catch (error) {
                console.error("Error marking holidays:", error);
            }
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
        
        
     
        onHoursChange: function (oEvent) {
            
            // this.onHoursLiveChange(oEvent);
            this.validateWorkingHours(oEvent);
        },


        validateWorkingHours: function () {
            const oInput = this.byId("TSD_id_TimeHours");
            const sValue = oInput.getValue();
            const iEnteredHours = parseFloat(sValue);
            const iMaxHours = this.getView().getModel("AssignModel").getProperty("/HoursWorked");

            if (isNaN(iEnteredHours) || iEnteredHours <= 0) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(this.i18nModel.getText("hoursEnter"));
                return false;
            } else if (iEnteredHours > iMaxHours) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText(this.i18nModel.getText("hoursExceed").replace("{0}", iMaxHours));
                return false;
            } else {
                oInput.setValueState(sap.ui.core.ValueState.None);
                return true;
            }
        },

     

    });
});