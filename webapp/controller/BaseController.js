sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "../model/formatter"
], function (Controller, JSONModel, Formatter) {
  "use strict";

  return Controller.extend("sap.kt.ktofferletter.products.controller.BaseController", {
    Formatter: Formatter,
    // Router Code 
    getRouter: function () {
      return sap.ui.core.UIComponent.getRouterFor(this);
    },

    calculateDateDifference: function (endDate, sStatus) {
      var thresholdDays = 30;
      if (!endDate) return "None";
      var parts = endDate.split('/');
      var day = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10) - 1;
      var year = parseInt(parts[2], 10);

      var endDateObj = new Date(year, month, day);

      var now = new Date();

      var timeDiff = endDateObj - now;
      var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      if (daysDiff <= thresholdDays && sStatus === "Active") {
        return "Indication03";
      } else {
        return;
      }
    },

    commonLoginFunction: function (value) {
      var oModel = this.getOwnerComponent().getModel("loginModel");
      var TileModel = this.getView().getModel("modelTileVisible");
      if (value && TileModel) {
        if (value === "EmployeeOffer" && TileModel.getProperty("/GenerateEmployeeOffer") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Contract" && TileModel.getProperty("/GenerateContract") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "MSA&SOW" && TileModel.getProperty("/GenerateMsaNda") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Trainee" && TileModel.getProperty("/GenerateTraineeOffer") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Holiday" && TileModel.getProperty("/ListOfHolidays") === false) {
        } else if (value === "ApplyLeave" && TileModel.getProperty("/ApplyLeave") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "MyInbox" && TileModel.getProperty("/MyInbox") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Expense" && TileModel.getProperty("/ExpenseApp") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "CompanyInvoice" && TileModel.getProperty("/InvoiceApp") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "SelfService" && TileModel.getProperty("/SelfService") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Customer" && TileModel.getProperty("/AddCustomer") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "IDCard" && TileModel.getProperty("/IDCard") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "ConsultantInvoice" && TileModel.getProperty("/ConsultantInvoice") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "EmployeeDetails" && TileModel.getProperty("/EmployeeDetail") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Quotation" && TileModel.getProperty("/QuotationApp") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "AssigmentTask" && TileModel.getProperty("/AssignmentTask") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "AssigmentTask" && TileModel.getProperty("/AssignmentTask") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "PaySlip" && TileModel.getProperty("/PaySlip") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "Timesheet" && TileModel.getProperty("/Timesheet") === false) {
          this.getRouter().navTo("RouteView1");
        } else if (value === "TimeSheetApproval" && TileModel.getProperty("/TimeSheetApproval") === false) {
          this.getRouter().navTo("RouteView1");
        }
      }

      if (!oModel) {
        this.getRouter().navTo("RouteView1");
        return;
      }
      var userId = oModel.getProperty("/userIds");
      var userName = oModel.getProperty("/userNames");
      if (!userId || !userName) {
        this.getRouter().navTo("RouteView1");
        return;
      }
    },

    _fetchCommonData: function (entityName, modelName, filter = "") {
      // if(this.getOwnerComponent().getModel(modelName) === undefined){
      let url =  this.getOwnerComponent().getModel("LoginModel").getData().url + entityName;
      sap.ui.core.BusyIndicator.show(0);
      try {
        $.ajax({
          url: url,
          method: "GET",
          headers:this.getOwnerComponent().getModel("LoginModel").getData().headers,
          data:filter,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            if (data) {
              var oModel = new JSONModel(data.data);
              this.getOwnerComponent().setModel(oModel, modelName);
            }
          }.bind(this),
          error: function (err) {
            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageToast.show(err.responseJSON?.message);
          }.bind(this)
        });
      } catch (error) {
        sap.ui.core.BusyIndicator.hide();
        sap.m.MessageToast.show("Technical error, please contact the administrator");
      }
    // }
    },
    //Common read call for all the app
    async ajaxReadWithJQuery(sUrl,filter) {
      sap.ui.core.BusyIndicator.show(0);
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url +sUrl+"?"+filter,
          method: "GET",
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            resolve(data);
          },
          error: function (error) {
            sap.ui.core.BusyIndicator.hide();
            reject(error);
          }
        });
      });
    },
    //Common create call for all the app
    async ajaxCreateWithJQuery(sUrl, oPayLoad) {
      sap.ui.core.BusyIndicator.show(0);
        return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "POST",
          data: JSON.stringify(oPayLoad),
          headers:this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            resolve(data);
          },
          error: function (error) {
            sap.ui.core.BusyIndicator.hide();
            reject(error);
          }
        });
      });
    },
    //Common update call for all the app
    async ajaxUpdateWithJQuery(sUrl, oPayLoad) {
      sap.ui.core.BusyIndicator.show(0);
        return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "PUT",
          data: JSON.stringify(oPayLoad),
          headers:this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            resolve(data);
          },
          error: function (error) {
            sap.ui.core.BusyIndicator.hide();
            reject(error);
          }
        });
      });
    },
    _calculateSalaryComponents: function (isTDSIncluded) {
      var oModel = this.getView().getModel("employeeModel");
      var CTC = parseFloat(oModel.getProperty("/CTC").replaceAll(",",""));
      var joiningBonus = parseFloat(oModel.getProperty("/JoiningBonus").replaceAll(",",""));
      var BasicSalary, TDS;
      // Calculate various salary components
      BasicSalary = (CTC * 0.49) / 12;           // Monthly Basic Salary from 49% of CTC
      var houseRentAllowance = (CTC * 0.49) / 12 * 0.50;     // 50% of Basic Salary
      var StatutoryBonus = (CTC * 0.49) / 12 * 0.09575;   // 9.575% of Basic Salary
      var TotalMontly = BasicSalary + houseRentAllowance + StatutoryBonus;  // Total Monthly Salary
      var TotalmothlyAnnualized = TotalMontly * 12;   // Annualized Monthly Salary
      TDS = TotalMontly * 0.1 * 12;  // Annual TDS at 10% of Basic Salary

      var MedicalInsurance = BasicSalary * 0.4; // Medical Insurance at 40% of Basic
      var Gratuity = (BasicSalary * 15) / 26;    // Gratuity calculation
      var TotalRetires = TDS + MedicalInsurance + Gratuity;
      var PerformanceBonus = (CTC * 5) / 100;  //5% of CTC as PerformanceBonus 
      var EngagementPB = (CTC * 5) / 100;   // 5% of CTC as EngagementPB 
      var TotalVariablePay = PerformanceBonus + EngagementPB;
      if (isTDSIncluded === "No TDS" || isTDSIncluded === "PF") {
        PerformanceBonus += (TDS / 2)
        EngagementPB += (TDS / 2);
        TotalVariablePay = PerformanceBonus + EngagementPB
        TDS = 0;
        TotalRetires = TDS + MedicalInsurance + Gratuity;
      }
      var CostofCompany = TotalmothlyAnnualized + TotalRetires + TotalVariablePay;
      var Total = CostofCompany + parseInt(joiningBonus);
      // Set calculated values in the model with formatting
      oModel.setProperty("/BasicSalary", this.Formatter.formatCurrencyInINRText(Math.round(BasicSalary)));
      oModel.setProperty("/HRA", this.Formatter.formatCurrencyInINRText(Math.round(houseRentAllowance)));
      oModel.setProperty("/StatutoryBonus", this.Formatter.formatCurrencyInINRText(Math.round(StatutoryBonus)));
      oModel.setProperty("/TotalMonthly", this.Formatter.formatCurrencyInINRText(Math.round(TotalMontly)));
      oModel.setProperty("/TotalmothlyAnnualized", this.Formatter.formatCurrencyInINRText(Math.round(TotalmothlyAnnualized)));
      oModel.setProperty("/TDS", this.Formatter.formatCurrencyInINRText(Math.round(TDS)));
      oModel.setProperty("/MedicalInsurance", this.Formatter.formatCurrencyInINRText(Math.round(MedicalInsurance)));
      oModel.setProperty("/Gratuity", this.Formatter.formatCurrencyInINRText(Math.round(Gratuity)));
      oModel.setProperty("/TotalRetires", this.Formatter.formatCurrencyInINRText(Math.round(TotalRetires)));
      oModel.setProperty("/PerformanceBonus", this.Formatter.formatCurrencyInINRText(Math.round(PerformanceBonus)));
      oModel.setProperty("/EngagementPB", this.Formatter.formatCurrencyInINRText(Math.round(EngagementPB)));
      oModel.setProperty("/TotalVariablePay", this.Formatter.formatCurrencyInINRText(Math.round(TotalVariablePay)));
      oModel.setProperty("/CostofCompany", this.Formatter.formatCurrencyInINRText(Math.round(CostofCompany)));
      oModel.setProperty("/Total", this.Formatter.formatCurrencyInINRText(Math.round(Total)));
    },
  })
});