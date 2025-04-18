sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
  ],
  function (
    BaseController,JSONModel,MessageToast,) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.ConsultantInvoice",
      {
        onInit: function () {
          this.getRouter().getRoute("RouteConsultantInvoiceApplication").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
          // Get i18n resource bundle
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          // Set header name in LoginModel
          this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("consultantInvoice"));
          this._fetchCommonData("ConsultantInvoice", "ConsultantModel", {})
        },
        
        ContractReadCall: function () {
          const userId = this.getOwnerComponent().getModel("LoginModel").getData();
          let filterString = "";
          let showInvoiceNo = true;
          if (userId.Role === "Contractor") {
            showInvoiceNo = false;
            filterString = "$filter=EmployeeID eq '" + userId.EmployeeID + "'";
          } else if (userId.Role === "Admin" || userId.Role === "Accountant") {
            filterString = ""; // No filter
          } else {
            filterString = "$filter=EmployeeID eq '" + userId.EmployeeID + "'";
          }
          this.byId("CI_id_InvoiceNo").setVisible(showInvoiceNo);
          this._fetchCommonData("ConsultantInvoice", "ConsultantModel", {})
        },
        

        CI_onPressAddInvoice: function () {
          this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
            sPath: "X", oPath: "Y",});
        },

        CI_onPressInvoice: function (oEvent) {
          var oBindingContext = oEvent.getSource().getBindingContext("ConsultantModel");
          var oInvoiceNo = oBindingContext.getProperty("InvoiceNo");
          var oEmployeeID = oBindingContext.getProperty("EmployeeID");
          this.getRouter().navTo("RouteNavConsultantInvoiceApplication", {
            sPath: encodeURIComponent(oInvoiceNo),
            oPath: encodeURIComponent(oEmployeeID)
          });
        },
        
        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
            this.getRouter().navTo("RouteLoginPage");
        },
      }
    );
  }
);
