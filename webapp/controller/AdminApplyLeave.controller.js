sap.ui.define(
    [
      "./BaseController", //call base controller
      "sap/ui/model/json/JSONModel",
      "sap/m/MessageToast",
      "../utils/validation",
      "../model/formatter",
       "sap/m/MessageBox"
    ],
    function (
      BaseController, JSONModel, MessageToast,utils,Formatter,MessageBox) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.AdminApplyLeave",
      {
        Formatter: Formatter,
        onInit: function () {
          this.getRouter().getRoute("RouteAdminApplyLeave").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var that = this;
            that.oModel = that.getOwnerComponent().getModel();
            var loginModel = that.getOwnerComponent().getModel("LoginModel");
            that.userId = loginModel.getProperty("/EmployeeID");
            that.Type = loginModel.getProperty("/Role");
            
            that._fetchCommonData("Leaves", "LeaveModel", { employeeID: that.userId });
            that._fetchCommonData("LeaveType", "leaveTypeModel", { type: "Employee" });
            
            that.i18nModel = that.getView().getModel("i18n").getResourceBundle();
            that.getView().getModel("LoginModel").setProperty("/HeaderName", that.i18nModel.getText("leaveApplication"));
            
            that.byId("AL_id_LeaveBarChart").setVisible(false);
            that.byId("AL_id_LeaveTableStandard").setVisible(true);
            that.byId("AL_id_leavefilterbar").setVisible(true);
            that.byId("AL_id_LeaveYear").setValue(new Date().getFullYear());

            var oJson = new JSONModel({ selectedType: 1 })
            that.getView().setModel(oJson, "selectedModel");
            
            that._fetchCommonData("ListOfHolidays", "HolidayModel", {});   
            that.BarDisplayFunction("All In One Leave", that.userId);
            that.MonthBarDisplayFunction("All In One Leave", that.userId);
            that.YearlyBarDisplayFunction(that.userId);
        
            // if (that.Role !== "Trainee") {
            //     that.MonthBarDisplayFunction("All In One Leave", that.userId);
            //     that.YearlyBarDisplayFunction(that.userId);
            //     that.EmployeeDetReadCall("EmployeeDetails", "ID", that.userId);
            // } else {
            //     that.EmployeeDetReadCall("Trainee", "TraineeId", that.userId);
            // }
        
            var barDataModel = new JSONModel({ Name: 'line', type: 'column', AllStatus: 'column' });
            that.getView().setModel(barDataModel, "MonthlyBar");
        },
        
        BarDisplayFunction: async function (leaveType, userId) {
            let jsonData = {
                "data": {
                    "EmployeeID": userId,
                    "selectYear": new Date().getFullYear(),
                    "LeaveType": leaveType
                }
            };
        
            try {
                sap.ui.core.BusyIndicator.show(0);
                let oData = await this.ajaxCreateWithJQuery("/LeavesFirstBarChart", jsonData);
                sap.ui.core.BusyIndicator.hide();
        
                let firstChartData = oData.results.filter(item => 
                    ["Submitted", "Approved", "Quota"].includes(item.LeaveStatus)
                );
                let secondChartData = oData.results.filter(item => 
                    ["Submitted", "Approved", "All Quota"].includes(item.LeaveStatus)
                );
        
                let oFirstChartModel = new JSONModel({ chartData: firstChartData });
                this.getView().setModel(oFirstChartModel, "firstLeaveData");
        
                let oSecondChartModel = new JSONModel({ chartData: secondChartData });
                this.getView().setModel(oSecondChartModel, "secondLeaveData");
        
                this._configureChart("AL_id_VizFrame6", oFirstChartModel, "Current Available Leave Quota");
                this._configureChart("AL_id_VizFrameAll", oSecondChartModel, "Yearly Leave Quota");
        
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
        },
        
        _configureChart: function (chartId, oModel, titleText) {
            let oVizFrame = this.getView().byId(chartId);
            if (!oVizFrame) return; 
        
            oVizFrame.setModel(oModel);
            oVizFrame.setVizProperties({
                legend: {
                    title: { visible: true, text: "All Measures" }
                },
                title: {
                    visible: true,
                    text: titleText
                },
                plotArea: {
                    dataPointStyle: {
                        rules: [
                            {
                                dataContext: { LeaveType: "Submitted" },
                                properties: { color: "#fc7b03" },
                                "displayName": "Submitted"
                            },
                            {
                                dataContext: { LeaveType: "Approved" },
                                properties: { color: "#4CAF50" },
                                "displayName": "Approved"
                            },
                            {
                                dataContext: { LeaveType: "Quota" },
                                properties: { color: "#4c79e0" },
                                "displayName": "Quota"
                            }
                        ]
                    }
                }
            });
        
            let popoverId = (chartId === "AL_id_VizFrame6") ? "AL_id_PieChart" : (chartId === "AL_id_VizFrameAll") ? "AL_id_PieChartAll" : null; 
            let oPopOver = popoverId ? this.getView().byId(popoverId) : null;
            if (oPopOver) {
                oPopOver.connect(oVizFrame.getVizUid());
            }
        },
        
        MonthBarDisplayFunction: async function (leaveType, userId) {
            let jsonData = { "data": { "EmployeeID": userId, "selectYear": new Date().getFullYear(), "LeaveType": leaveType } };
            try {
                sap.ui.core.BusyIndicator.show(0);
                let oData = await this.ajaxCreateWithJQuery("/MonthyBarChart", jsonData);
                sap.ui.core.BusyIndicator.hide();
        
                let oLeaveModel = new JSONModel({ chartData: oData.results });
                this.getView().setModel(oLeaveModel, "MonthleaveData");
        
                var oVizFrame = this.getView().byId("AL_id_VizFrame");
                oVizFrame.setVizProperties({
                    legend: {
                        title: {
                            visible: true,
                        }
                    },
                    title: {
                        visible: true,
                        text: "Monthly Approved Leave"
                    }
                });
        
                oVizFrame.setModel(oLeaveModel);
        
                var oPopOver = this.getView().byId("AL_id_PopOver");
                oPopOver.connect(oVizFrame.getVizUid());
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
        },
        
        YearlyBarDisplayFunction: async function (userId) {
            let jsonData = { "data": { "EmployeeID": userId } };
            try {
                sap.ui.core.BusyIndicator.show(0);
                let oData = await this.ajaxCreateWithJQuery("/YearlyBarChart", jsonData);
                sap.ui.core.BusyIndicator.hide();
        
                let rawData = oData.results;
                let result = [];
        
                rawData.forEach(item => {
                    let yearEntry = result.find(entry => entry.Year === item.Year);
                    if (!yearEntry) {
                        yearEntry = { Year: item.Year };
                        result.push(yearEntry);
                    }
                    yearEntry[item.LeaveType.replace(/\s+/g, '')] = item.Count;
                });
        
                let oLeaveModel = new JSONModel({ chartData: result });
                this.getView().setModel(oLeaveModel, "YearleaveData");
        
                var oVizFrame = this.getView().byId("AL_id_VizFrameYear");
                oVizFrame.setVizProperties({
                    legend: {
                        title: {
                            visible: true,
                        }
                    },
                    title: {
                        visible: true,
                        text: "Yearly Approved Leave"
                    }
                });
        
                oVizFrame.setModel(oLeaveModel);
        
                var oPopOver = this.getView().byId("AL_id_PopOver");
                oPopOver.connect(oVizFrame.getVizUid());
            } catch (error) {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
        },
        
        // EmployeeDetReadCall: async function (entity, filterField, value) {
        //     sap.ui.core.BusyIndicator.show(0);
        //     try {
        //         let filter = {};
        //         filter[filterField] = value;
        
        //         let data = await this.ajaxReadWithJQuery("/" + entity, filter);
        //         sap.ui.core.BusyIndicator.hide();
        
        //         if (data.results.length > 0) {
        //             let joiningDateField = (entity === "Trainee") ? "JoiningDate" : "AppraisalDate";
        //             this.JoiningDate = data.results[0][joiningDateField].split("/").map(Number);
        
        //             let addYears = [];
        //             let nowYear = new Date().getFullYear();
        //             let smallestYear = this.JoiningDate[2];
        //             let length = nowYear - smallestYear;
        
        //             for (let i = 0; i <= length; i++) {
        //                 addYears.push(smallestYear + i);
        //             }
        
        //             let yearModel = new JSONModel({ items: addYears });
        //             this.getView().setModel(yearModel, "YearModel");
        //         }
        //     } catch (error) {
        //         sap.ui.core.BusyIndicator.hide();
        //         sap.m.MessageToast.show("Error fetching employee details.");
        //     }
        // },
    
        AL_onPressPie: function () {
            this.getView().getModel("MonthlyBar").setProperty("/type", "pie");
        },

        AL_onPressColumn: function () {
            this.getView().getModel("MonthlyBar").setProperty("/type", "column");
        },

        AL_onPressBar: function () {
            this.getView().getModel("MonthlyBar").setProperty("/type", "line");
        },

        AL_onChangeLeaveType: function (oEvent) {
            var year = this.byId("AL_id_LeaveYear").getValue()
            this.BarDisplayFunction(oEvent.getSource().getValue(), this.userId + "/" + year);
            this.MonthBarDisplayFunction(oEvent.getSource().getValue(), this.userId + "/" + year);
        },

        AL_onChangeYears: function (oEvent) {
            var type = this.byId("AL_id_TypeOfLeave").getValue();
            this.BarDisplayFunction(type, this.userId + "/" + oEvent.getSource().getValue());
            this.MonthBarDisplayFunction(type, this.userId + "/" + oEvent.getSource().getValue());
        },

        AL_onPressBarChart: function () {
            this.byId("AL_id_LeaveBarChart").setVisible(true);
            this.byId("AL_id_LeaveTableStandard").setVisible(false);
            this.byId("AL_id_leavefilterbar").setVisible(false);
            if (this.Type === "Trainee") {
                this.byId("AL_id_MonthlyChart").setVisible(false);
                this.byId("AL_id_YearlyChart").setVisible(false);
                this.byId("AL_id_LeaveYear").setVisible(false);
                this.byId("AL_id_YearLabel").setVisible(false);
            }else{
                this.byId("AL_id_MonthlyChart").setVisible(true);
                this.byId("AL_id_YearlyChart").setVisible(true);
                this.byId("AL_id_LeaveYear").setVisible(true);
                this.byId("AL_id_YearLabel").setVisible(true);
            }
        },

        AL_onPressGoSmartTable: function () {
            this.byId("AL_id_LeaveBarChart").setVisible(false);
            this.byId("AL_id_LeaveTableStandard").setVisible(true);
            this.byId("AL_id_leavefilterbar").setVisible(true);
            this.BarDisplayFunction("All In One Leave", this.userId);
            this.byId("AL_id_TypeOfLeave").setValue("All In One Leave");
            this.byId("AL_id_LeaveYear").setValue(new Date().getFullYear());
            if (this.Type !== "Trainee") {
                this.MonthBarDisplayFunction("All In One Leave", this.userId);
                this.YearlyBarDisplayFunction(this.userId);
            }
        },

        AL_onPressBarChartMonth: function () {
            this.getView().getModel("MonthlyBar").setProperty("/Name", "column");
        },

        AL_onPresslineChartMonth: function () {
            this.getView().getModel("MonthlyBar").setProperty("/Name", "line");
        },

        AL_onPressAreaChart: function () {
            this.getView().getModel("MonthlyBar").setProperty("/AllStatus", "area");
        },

        AL_onPressColumnAllStatus: function () {
        this.getView().getModel("MonthlyBar").setProperty("/AllStatus", "column");
        },

        onShowMore: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext("LeaveModel");
            if (!oBindingContext) {
            MessageToast.show("No data available.");
                return;
            }
            var sFullText = oBindingContext.getProperty("managerRemark")
            var oDialog = new sap.m.Dialog({
                title: this.getView().getModel("i18n").getProperty("managerRemarks"),
                content: new sap.ui.core.HTML({ content: `<p>${sFullText}</p>` }),
                beginButton: new sap.m.Button({
                    text: "Close",
                    press: function () { oDialog.close(); }
                })
            });
            oDialog.open();
        },

        onMarkCalendarDatesAndLeaves: function () {
            var that = this;
            this.oDatePicker.removeAllSpecialDates(); 
            var leaveRecords = that.getView().getModel("LeaveModel").getData(); 
            var holidays = that.getView().getModel("HolidayModel").getData(); 
            var holidaySet = new Set(holidays.map(function (holiday) {
                return new Date(holiday.Date).toDateString(); 
            }));

            function parseDate(dateStr) {
            var parts = dateStr.split('/');
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        
            var appliedLeaves = [];
            var yearStart = new Date(new Date().getFullYear(), 0, 1);
            var yearEnd = new Date(new Date().getFullYear(), 11, 31);
        
            leaveRecords.forEach(function (record) {
                if (record["Status"] !== "Rejected") {
                var fromDate = parseDate(that.Formatter.formatDate(record.fromDate));
                var toDate = parseDate(that.Formatter.formatDate(record.toDate));
                
                    if (fromDate && toDate) {
                        for (var d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
                            appliedLeaves.push({
                                date: new Date(d),
                                employeeId: record["employeeID"]
                            });
                        }
                    }
                }
            });
        
            var appliedLeavesSet = new Set(appliedLeaves.map(leave => leave.date.toDateString()));
        
            for (var d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
                var day = d.getDay();
                var isWeekend = (day === 0 || day === 6);
                var isHoliday = holidaySet.has(d.toDateString());
                var isAppliedLeave = appliedLeavesSet.has(d.toDateString());
        
                var dateRange = new sap.ui.unified.DateTypeRange({
                    startDate: new Date(d),
                    endDate: new Date(d)
                });
        
                if (isHoliday) {
                    dateRange.setType("Type04");
                    dateRange.setTooltip("Holiday");
                } else if (isWeekend) {
                    dateRange.setType("Type09");
                    dateRange.setTooltip("Weekend");
                } else if (isAppliedLeave) {
                    dateRange.setType("Type05");
                    dateRange.setTooltip("Applied Leave");
                } else {
                    dateRange.setType("Type06");
                    dateRange.setTooltip("Working Day");
                }
                this.oDatePicker.addSpecialDate(dateRange);
            }
            that.appliedLeavesSet = appliedLeavesSet;
        },
        
        onInitializeLegend: function (oEvent) {
            this.oDatePicker = oEvent.getSource();
            if (this.oDatePicker) {
                var oLegend = new sap.ui.unified.CalendarLegend({
                    items: [
                        new sap.ui.unified.CalendarLegendItem({
                            type: "Type04",
                            text: "Holiday"
                        }),
                        new sap.ui.unified.CalendarLegendItem({
                            type: "Type09",
                            text: "Weekend"
                        }),
                        new sap.ui.unified.CalendarLegendItem({
                            type: "Type06",
                            text: "Working Day"
                        }),
                        new sap.ui.unified.CalendarLegendItem({
                            type: "Type05",
                            text: "Applied Leaves"
                        })
                    ]
                });
                this.oDatePicker.setLegend(oLegend); 
                this.onMarkCalendarDatesAndLeaves(); 
            }
        },
    
        AL_onPressApplyLeave: function () {
          var oView = this.getView();
          var loginData = this.getOwnerComponent().getModel("LoginModel").getData();
          var currentYear = new Date().getFullYear();
          var leaveJson = {
              employeeID: loginData.EmployeeID,
              employeeName: loginData.EmployeeName,
              email: loginData.EmailID,
              fromDate: "",
              toDate: "",
              NoofDays: "",
              typeOfLeave: "All In One Leave",
              comments: "",
              Submit: true,
              Save: false,
              halfDay: false,
              MinToDate: null,
              managerRemark: "",
              maxDate: new Date(currentYear, 11, 31),
              isUpdate: false,
          };
          var oLeaveTempModel = new JSONModel(leaveJson);
          oView.setModel(oLeaveTempModel, "LeaveTempModel");
          this.openLeaveDialog(oView);
        },

        AL_onPressUpdate: function () {
            var oView = this.getView();
            var oTable = this.byId("AL_id_LeaveTableStandard").getSelectedItem();
            var oModelData = oTable.getBindingContext("LeaveModel");
            oModelData = oModelData.getObject();
            var currentYear = new Date().getFullYear();
            var leaveJson = {
                ID: oModelData.ID, 
                employeeID: oModelData.employeeID,
                employeeName: oModelData.employeeName,
                email: oModelData.email,
                fromDate: this.Formatter.formatDate(oModelData.fromDate),
                toDate: this.Formatter.formatDate(oModelData.toDate),
                NoofDays: oModelData.NoofDays,
                typeOfLeave: oModelData.typeOfLeave,
                comments: oModelData.comments,
                Submit: false,
                Save: true,
                halfDay: oModelData.halfDay === "false" ? false : true,
                managerRemark: oModelData.ManagerRemark,
                maxDate: new Date(currentYear, 11, 31),
                isUpdate: true,
            };
            var oLeaveTempModel = new JSONModel(leaveJson);
            oView.setModel(oLeaveTempModel, "LeaveTempModel");
            this.openLeaveDialog(oView);
        },

        // Open the leave dialog fragment
        openLeaveDialog: function (oView) {
          if (!this.oDialog) {
              sap.ui.core.Fragment.load({
                  name: "sap.kt.com.minihrsolution.fragment.ApplyLeave",
                  controller: this,
              }).then(function (oDialog) {
                  this.oDialog = oDialog;
                  oView.addDependent(this.oDialog);
                  this._resetDialogFields(); 
                  this.oDialog.open();
              }.bind(this));
          } else {
            this._resetDialogFields(); 
            this.oDialog.open();
          }
       },

        _resetDialogFields: function () {
            this._FragmentDatePickersReadOnly(["AL_id_FromDate", "AL_id_ToDate"]);
            sap.ui.getCore().byId("AL_id_FromDate").setValueState("None");
            sap.ui.getCore().byId("AL_id_ToDate").setValueState("None");
            sap.ui.getCore().byId("AL_id_LeaveComments").setValueState("None");
        },
      
        // Close the leave dialog fragment
        AL_onPressClose: function () {
          this.oDialog.close();
        },

        onFormatDate: function (dateString) {
            var parts = dateString.split('/');
            return new Date(parts[2], parts[1] - 1, parts[0]);
        },
        
        onLiveChange: function () {
            var oLeaveModel = this.getView().getModel("LeaveTempModel");
            var sFromDate = oLeaveModel.getProperty("/fromDate");
            var sToDate = oLeaveModel.getProperty("/toDate");
            var isHalfDay = oLeaveModel.getProperty("/halfDay");
        
            var LeaveModel = this.getView().getModel("LeaveModel").getData();
            var filterData = LeaveModel.filter((item) => {
                return item.ID === oLeaveModel.getData().ID;
            });
        
            if (sFromDate === sToDate) {
                var noOfDays = isHalfDay ? "0.5" : "1";
                oLeaveModel.setProperty("/NoofDays", noOfDays);
                if (filterData.length !== 0) {
                    filterData[0].NoofDays = noOfDays;
                }
                return;
            }
        
            var holidays = this.getView().getModel("HolidayModel").getData();
            var sNoofDays = this.calculateBusinessDays(sFromDate, sToDate, holidays);
            if (isHalfDay) {
                sNoofDays -= 0.5;
            }
        
            oLeaveModel.setProperty("/NoofDays", sNoofDays.toString());
            if (filterData.length !== 0) {
                filterData[0].NoofDays = oLeaveModel.getProperty("/NoofDays");
            }
        },
        
        calculateBusinessDays: function (startDate, endDate, holidays) {
            var start = this.onFormatDate(startDate);
            var end = this.onFormatDate(endDate);
            var holidaySet = new Set(holidays.map(function (holiday) {
                var holidayDate = this.Formatter.formatDate(holiday.Date);
                var dateObject = this.onFormatDate(holidayDate); 
                return dateObject.toDateString(); 
            }, this));

            var diff = end - start;
            var totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
            var businessDays = 0;

            for (var i = 0; i < totalDays; i++) {
                var currentDate = new Date(start);
                currentDate.setDate(start.getDate() + i);
                var dayOfWeek = currentDate.getDay();
                var dateString = currentDate.toDateString();

                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateString)) {
                    businessDays++;
                }
            }
            return businessDays;
        },
         
        onHalfDaySelect: function () {
          var oLeaveModel = this.getView().getModel("LeaveTempModel");
          oLeaveModel.setProperty("/halfDay", !!oLeaveModel.getProperty("/halfDay"));
          this.onLiveChange();
        },

        isLeaveAlreadyApplied: function (fromDate, toDate) {
            var from = this.onFormatDate(fromDate);
            var to = this.onFormatDate(toDate);

            for (var d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
                if (this.appliedLeavesSet.has(d.toDateString())) {
                    return true;
                }
            }
            return false;
        },

        onValidation: function () {
            var oLeaveModel = this.getView().getModel("LeaveTempModel");
            var sFromDate = oLeaveModel.getProperty("/fromDate");
            sFromDate = this.onFormatDate(sFromDate);
            var oFromDate = new Date(sFromDate);
            if (!isNaN(oFromDate.getTime())) {
                oLeaveModel.setProperty("/MinToDate", oFromDate);
            }
        },

        AL_ValidateFromDate: function (oEvent) {
            this.onValidation();
            this.onLiveChange();
            return !!this.getView().getModel("LeaveTempModel").getProperty("/fromDate");
        },

        AL_ValidateToDate: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sValue = oDatePicker.getValue();
            var formDataYear = sap.ui.getCore().byId("AL_id_FromDate").getValue().split("/")[2];
            var toDateYear = sValue.split('/')[2];
            if (formDataYear === toDateYear) {
                this.currentYear = toDateYear;
                // this.BarDisplayFunctionAllStatus("All In One Leave", this.userId + "/" + toDateYear);
            }
            this.onLiveChange();
            return !!this.getView().getModel("LeaveTempModel").getProperty("/ToDate");
        },

        AL_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
          this.getRouter().navTo("RouteLoginPage");
        },

        AL_handleLeaveAction: function (actionType) {
            try {
                if (
                    utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_FromDate"), "ID") &&
                    utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_ToDate"), "ID") &&
                    utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AL_id_LeaveComments"), "ID")
                ) {
                    var oLeaveTempModel = this.getView().getModel("LeaveTempModel");
                    var oData = oLeaveTempModel.getData();
                    oData.halfDay = oData.halfDay.toString();
                    oData.status = "Submitted";
                    
                    var fromDateParts = oData.fromDate.split("/").map(Number);
                    var startDate = new Date(fromDateParts[2], fromDateParts[1] - 1, fromDateParts[0]);
                    var toDateParts = oData.toDate.split("/").map(Number);
                    var endDate = new Date(toDateParts[2], toDateParts[1] - 1, toDateParts[0]);
        
                if (fromDateParts[2] !== toDateParts[2]) {
                return MessageBox.error(this.i18nModelMess.getText("leaveSameYear"));
                }
        
                if (oData.fromDate === oData.toDate) {
                var isValid = true;
                var holidays = this.getView().getModel("HolidayModel").getData(); 
                holidays.forEach((holiday) => {
                if (new Date(holiday.date).getTime() === startDate.getTime()) {
                    isValid = false;
                    }
                });
                if (!isValid) {
                return MessageBox.error(this.i18nModel.getText("holidaysMess"));
                }
                }
        
                if (parseFloat(oData.NoofDays) <= 2) {
                var isFromDateWeekend = (startDate.getDay() === 0 || startDate.getDay() === 6);
                var isToDateWeekend = (endDate.getDay() === 0 || endDate.getDay() === 6);
                if (isFromDateWeekend && isToDateWeekend) {
                return MessageBox.error(this.i18nModel.getText("holidaysMess"));
                }
                }
        
                if (this.isLeaveAlreadyApplied(oData.fromDate, oData.toDate)) {
                return MessageBox.error(this.i18nModel.getText("leaveAlreadyApplied"));
                 }
        
                    oData.fromDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                    oData.toDate = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];
        
                    delete oData.Save;
                    delete oData.Submit;
                    delete oData.MinToDate;
                    delete oData.ManagerRemark;
                    delete oData.maxDate;
                    delete oData.minDate;
                    delete oData.isUpdate;
        
                    if (actionType === "Submit") {
                        this.ajaxCreateWithJQuery("Leaves", { data: oData })
                            .then(response => {
                                this._handleResponse(response, "leaveSubmitted");
                            })
                            .catch(() => MessageToast.show(this.i18nModel.getText("commonErrorMessage")));
                    } else if (actionType === "Save") {
                        var requestData = { filters: { ID: oData.ID }, data: oData };
                        this.ajaxUpdateWithJQuery("Leaves", requestData)
                            .then(response => {
                                this._handleResponse(response, "leaveUpdatedSuccess");
                            })
                            .catch(() => MessageToast.show(this.i18nModel.getText("commonErrorMessage")));
                    }
                } else {
                    MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                }
            } catch (error) {
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
        },
        
        _handleResponse: function (response, successMessageKey) {
            if (response.success === true) {
                MessageToast.show(this.i18nModel.getText(successMessageKey));
                this.oDialog.close();
                this._fetchCommonData("Leaves", "LeaveModel", { employeeID: this.userId });
            } else {
                MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
        },
        
        AL_onPressSubmit: function () {
            this.AL_handleLeaveAction("Submit");
        },
        
        AL_onPressSave: function () {
            this.AL_handleLeaveAction("Save");
        },
      
        onSelectionChange: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oContext = oSelectedItem.getBindingContext("LeaveModel");
            var sStatus = oContext.getProperty("status"); 
            var oUpdateButton = this.byId("AL_id_Updatebtn");
            var bVisible = sStatus === "Submitted";
            oUpdateButton.setVisible(bVisible);
        },

        AL_onSearch: function () {
            var aFilterItems = this.byId("AL_id_leavefilterbar").getFilterGroupItems();
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });

            var params = {};

            aFilterItems.forEach(function (oItem) {
                var oControl = oItem.getControl();
                var sFilterName = oItem.getName();

                if (oControl) {
                    if (oControl.isA("sap.m.DateRangeSelection")) {
                        var oFromDate = oControl.getDateValue();
                        var oToDate = oControl.getSecondDateValue();
                        if (oFromDate) {
                            params["fromDate"] = oDateFormat.format(oFromDate);
                        }
                        if (oToDate) {
                            params["toDate"] = oDateFormat.format(oToDate);
                        }
                    } else if (oControl.isA("sap.m.ComboBox")) {
                        var oSelectedItem = oControl.getSelectedItem();
                        if (oSelectedItem) {
                            params[sFilterName] = oSelectedItem.getProperty("text");
                        }
                    } else if (oControl.getValue && oControl.getValue()) {
                        params[sFilterName] = oControl.getValue();
                    }
                }
            });
            this._fetchCommonData("Leaves", "LeaveModel", { employeeID: this.userId, ...params });
        },

        AL_onClear : function () {
            this.byId("AL_id_DateRangeSelection").setDateValue(null);
            this.byId("AL_id_DateRangeSelection").setSecondDateValue(null);
            var oComboBox = this.getView().byId("AL_id_TypeOfLeavecombo");
            oComboBox.setSelectedKey("");
        }   
      },
    );
  }
);
