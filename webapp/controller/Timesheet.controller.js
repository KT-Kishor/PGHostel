sap.ui.define(["./BaseController", "sap/ui/model/json/JSONModel", "sap/m/MessageToast", "sap/ui/unified/CalendarLegend",
    "sap/ui/unified/CalendarLegendItem", "sap/ui/unified/DateTypeRange", "sap/ui/unified/CalendarDayType", "sap/ui/core/BusyIndicator", "sap/m/MessageBox"],
    function (BaseController, JSONModel, MessageToast, CalendarLegend, CalendarLegendItem, DateTypeRange, CalendarDayType, BusyIndicator, MessageBox) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.Timesheet", {
            onInit: function () {
                this.getRouter().getRoute("RouteTimesheet").attachMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function () {
                this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

                const oViewModel = new JSONModel();
                oViewModel.setData({
                    calendarStartDate: this._getStartOfWeek(new Date()) // e.g., Monday
                });
                this.getView().setModel(oViewModel, "viewModel");
                var loginModel = this.getOwnerComponent().getModel("LoginModel");
                this.EmployeeID = this.getOwnerComponent().getModel("LoginModel").getProperty("/EmployeeID");
                this._fetchCommonData("EmployeeDetails", "EmployeeModel", { EmployeeID: this.EmployeeID });

                this.branch = loginModel.getProperty("/BranchCode");

                this.onInitializeCalendarLegend();
                this.TSD_ReadTimesheetEntries();
            },

            TS_onFillDetails: function () {
                this.getRouter().navTo("RouteTimesheetDetails", {sPath: "Timesheet"});
            },
            
            TS_onPressData: function (oEvent) {
                var sPath = oEvent.getSource().getBindingContext("FilteredTimesheetModel").getProperty("SrNo");

                // Navigate to Timesheet Details with 'edit' mode and actual SrNo
                this.getRouter().navTo("RouteTimesheetDetails", {
                    sPath: sPath
                });
            },

            TSD_ReadTimesheetEntries: async function (filter) {
                try {

                    //this.getBusyDialog();
                    await this.ajaxReadWithJQuery("Timesheet", { EmployeeID: this.EmployeeID }).then((oData) => {
                        var offerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                        this.getOwnerComponent().setModel(new JSONModel(offerData), "FilteredTimesheetModel");

                        this.closeBusyDialog();
                    }).catch((error) => {
                        this.closeBusyDialog();
                        MessageToast.show(error.message || error.responseText);
                    });
                } catch (error) {
                    this.closeBusyDialog();
                    MessageToast.show(this.i18nModel.getText("technicalError"));
                }
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


            onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                this.getRouter().navTo("RouteLoginPage");
            },


            onInitializeCalendarLegend: function () {
                this._ensureCalendarLegend();
            },

            // Ensure the calendar legend exists
            _ensureCalendarLegend: function () {
                let oLegend = this.byId("calendarLegend");
                if (!oLegend) {
                    oLegend = new CalendarLegend({
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

                const oCalendar = this.byId("TS_id_calendarTimesheet");
                if (oCalendar) {
                    oCalendar.setLegend(oLegend);
                }
            },


            // Mark holidays on the calendar by fetching data from the backend
            _markHolidaysOnCalendar: async function () {
                try {
                    const oCalendar = this.byId("TS_id_calendarTimesheet");
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
                        date.setHours(0, 0, 0, 0); // Normalize

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


            onCalendarDateSelect: function (oEvent) {
                const oCalendar = oEvent.getSource();
                const aSelectedDates = oCalendar.getSelectedDates();

                if (aSelectedDates.length > 0) {
                    const oSelectedDate = aSelectedDates[0].getStartDate();

                    // Format selected date to dd/mm/yyyy
                    const sDay = oSelectedDate.getDate().toString().padStart(2, '0');
                    const sMonth = (oSelectedDate.getMonth() + 1).toString().padStart(2, '0');
                    const sYear = oSelectedDate.getFullYear().toString();
                    const sFormattedDate = `${sDay}/${sMonth}/${sYear}`;

                    // DEBUG
                    console.log("Selected Date:", sFormattedDate);

                    // Get all timesheet data
                    const oTimesheetModel = this.getView().getModel("TimesheetModel");
                    const aTimesheetData = oTimesheetModel ? oTimesheetModel.getData() : [];

                    console.log("All Timesheet Data:", aTimesheetData);

                    // Filter timesheet entries for selected date
                    const aFilteredData = aTimesheetData.filter(entry => entry.Date === sFormattedDate);

                    // DEBUG
                    console.log("Filtered Timesheet Data:", aFilteredData);

                    // Set filtered data to a new model for display
                    const oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredData);
                    this.getView().setModel(oFilteredModel, "FilteredTimesheetModel");

                    if (aFilteredData.length === 0) {
                        MessageToast.show("No timesheet entries for selected date.");
                    }
                }
            },

            onMonthChange: function (oEvent) {
                const sMonth = oEvent.getSource().getSelectedKey(); // e.g., "01"
                const iYear = new Date().getFullYear(); // or allow year selection separately

                const oTimesheetModel = this.getView().getModel("TimesheetModel");
                const aAllEntries = oTimesheetModel ? oTimesheetModel.getData() : [];

                const aFilteredEntries = aAllEntries.filter(entry => {
                    if (!entry.Date) return false;

                    // Entry.Date expected as "dd/mm/yyyy"
                    const parts = entry.Date.split("/");
                    return parts.length === 3 && parts[1] === sMonth && parts[2] === iYear.toString();
                });

                const oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredEntries);
                this.getView().setModel(oFilteredModel, "FilteredTimesheetModel");

                if (aFilteredEntries.length === 0) {
                    MessageToast.show("No timesheet entries for selected month.");
                }
            },


            TS_onDeleteTimesheet: async function () {
                const oTable = this.byId("TS_id_calendarTimesheet").getParent().getContent()[3]; // or just this.byId("yourTableId") if ID is given
                const oSelectedItem = oTable.getSelectedItem();

                if (!oSelectedItem) {
                    MessageBox.warning("Please select a row to delete.");
                    return;
                }
                const oSelectedData = oSelectedItem.getBindingContext("FilteredTimesheetModel").getObject();

                const that = this;

                MessageBox.confirm("Are you sure you want to delete this timesheet entry?", {
                    onClose: async function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            try {
                                await that.ajaxDeleteWithJQuery(`Timesheet/${oSelectedData.ID}`, {}); // Ensure your backend uses this format
                                MessageToast.show("Entry deleted successfully.");

                                // Refresh the model or table
                                that._loadTimesheetData(); // or whatever method you use to reload data
                            } catch (error) {
                                MessageBox.error("Failed to delete entry. Please check the console.");
                                console.error("Delete error:", error);
                            }
                        }
                    }
                });
            }
        });
    });