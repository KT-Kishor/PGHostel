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
      sap.ui.core.BusyIndicator.show(0);
      let url =  this.getView().getModel("LoginModel").getData().url + entityName;
      try {
        $.ajax({
          url: url,
          method: "GET",
          headers: this.getView().getModel("LoginModel").getData().headers,
          data:filter,
          success: function (data) {
            sap.ui.core.BusyIndicator.hide();
            if (data) {
              var oModel = new JSONModel(data);
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
    },
 
    _commonCompanyCodeDetails: function (filter = {branchcode: "KLB01"}) {
      this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", filter);
    },

    _commonDesignation: function (filter = "") {
      this._fetchCommonData("Designation", "DesignationModel", filter);
    },

    _commonBaseLocation: function (filter = "") {
      this._fetchCommonData("BaseLocation", "BaseLocationModel", filter);
    },

    _commonDepartment: function (filter = "") {
      this._fetchCommonData("Department", "DepartmentModel", filter);
    },

    _commonCompanyInvoiceSAC  : function (filter = "") {
      this._fetchCommonData("CompanyInvoiceSAC", "CompanyInvoiceSACModel", filter);
    },

    _commonCountry: function (filter = "") {
      this._fetchCommonData("Country", "CountryModel", filter);
    },

    _commonCurrency: function (filter = "") {
      this._fetchCommonData("Currency", "CurrencyModel", filter);
    },

    _commonPaymentTerms: function (filter = "") {
      this._fetchCommonData("PaymentTerms", "PaymentTermsModel", filter);
    },

    _commonTaskType: function (filter = "") {
      this._fetchCommonData("TaskType", "TaskTypeModel", filter);
    },

    _commonCompanyEmails: function (filter = {branchcode: "KLB01"}) {
      this._fetchCommonData("CompanyEmails", "CompanyEmailsModel", filter);
    },

    _commonLeaveType: function (filter = "") {
      this._fetchCommonData("LeaveType", "LeaveTypeModel", filter);
    },
  })
});