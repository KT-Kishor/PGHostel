sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation",
    "../model/formatter",
  ],
  function (
    BaseController, JSONModel, MessageToast,utils,Formatter) {
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
        that._fetchCommonData("ListOfHolidays", "HolidayModel", {});   
        },

      onShowMore: function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("LeaveModel");
        if (!oBindingContext) {
           MessageToast.show("No data available.");
            return;
        }
        var sFullText = oBindingContext.getProperty("managerRemark") || "No remarks available";
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
            var oTable = this.byId("AL_id_LeaveTableStandard").getSelectedItem();
            if (!oTable) {
                MessageBox.error(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("leaveEditSelectRowMess"));
                return;
            }
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
            this.getView().setModel(oLeaveTempModel, "LeaveTempModel");
            this.openLeaveDialog(this.getView());
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

        AL_onPressSubmit: function () {
          try {
              if (
                  utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_FromDate"), "ID") &&
                  utils._LCvalidateDate(sap.ui.getCore().byId("AL_id_ToDate"), "ID") &&
                  utils._LCvalidateMandatoryField(sap.ui.getCore().byId("AL_id_LeaveComments"), "ID")
              ) {
                var oData = this.getView().getModel("LeaveTempModel").getData();
                oData.status = "Submitted";
                oData.halfDay = oData.halfDay.toString();
                oData.fromDate = new Date( sap.ui.getCore().byId("AL_id_FromDate").getDateValue().getTime() -  sap.ui.getCore().byId("AL_id_FromDate").getDateValue().getTimezoneOffset() * 60000).toISOString().split("T")[0];
                oData.toDate = new Date( sap.ui.getCore().byId("AL_id_ToDate").getDateValue().getTime() -  sap.ui.getCore().byId("AL_id_ToDate").getDateValue().getTimezoneOffset() * 60000).toISOString().split("T")[0];
                  delete oData.Save;
                  delete oData.Submit;
                  delete oData.MinToDate;
                  delete oData.ManagerRemark;
                  delete oData.maxDate;
                  delete oData.minDate;
                  delete oData.isUpdate;
                  this.ajaxCreateWithJQuery("Leaves", { data: oData })
                  .then((response) => {
                  if (response.success === true) {
                  MessageToast.show(this.i18nModel.getText("msgCustomer3"));
                  this.oDialog.close();
                  this._fetchCommonData("Leaves", "LeaveModel", { employeeID: this.userId });
                  } else {
                    MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
                  }
                }).catch((error) => {
                  MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
              });
              } else {
                  MessageToast.show(this.i18nModel.getText("mandetoryFields"));
              }
          } catch (error) {
              MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          }
      },

      AL_onPressSave: function () {  
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
                oData.fromDate = new Date( sap.ui.getCore().byId("AL_id_FromDate").getDateValue().getTime() -  sap.ui.getCore().byId("AL_id_FromDate").getDateValue().getTimezoneOffset() * 60000).toISOString().split("T")[0];
                oData.toDate = new Date( sap.ui.getCore().byId("AL_id_ToDate").getDateValue().getTime() -  sap.ui.getCore().byId("AL_id_ToDate").getDateValue().getTimezoneOffset() * 60000).toISOString().split("T")[0]; 
                delete oData.Save;
                delete oData.Submit;
                delete oData.MinToDate;
                delete oData.managerRemark;
                delete oData.maxDate;
                delete oData.minDate;
                delete oData.isUpdate;
                var requestData = {filters: { ID: oData.ID }, data: oData};
                this.ajaxUpdateWithJQuery("Leaves", requestData).then((response) => {
                if (response.success === true) {
                MessageToast.show(this.i18nModel.getText("msgCustomer4"));
                this.oDialog.close();
                this._fetchCommonData("Leaves", "LeaveModel", { employeeID: this.userId });
            } else {
             MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
            }
            }).catch((error) => {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
         });
        } else {
        MessageToast.show(this.i18nModel.getText("mandetoryFields"));
        }
        } catch (error) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
        }
      },    
      }
    );
  }
);
