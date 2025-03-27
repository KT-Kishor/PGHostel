sap.ui.define([
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/validation"
],
    function (BaseController, JSONModel, MessageToast,utils) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.ManageCustomer", {
        onInit: function () {
        this.getRouter().getRoute("RouteManageCustomer").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched:function(oEvent){
        this.getView().getModel("LoginModel").setProperty("/HeaderName", "Customer Details"); 
        },

        MC_onAddCustomerDetails: function () {
          var oView = this.getView();
          var data = { save: false, submit: true, CC_id_CustInput: false, selectedIndex: 0 };
          var visibleData = new sap.ui.model.json.JSONModel(data);
          this.getView().setModel(visibleData, "visiblePlay");
          var AddCustomerModel = {
            CompanyName: "",
            Name: "",
            PAN: "",
            GST: "",
            Address: "",
            MailID: "",
            MobileNo: "",
            LUT: "",
            Type: "",
            Value: "0",
            Salutation: "Mr.",
            CustomerEmail: "",
          };
          var oModel = new JSONModel(AddCustomerModel);
          this.getView().setModel(oModel, "CreateCustomerModel");
          this.openLeaveDialog(oView);
        },

        // Open the leave dialog fragment
        openLeaveDialog: function (oView) {
          if (!this.oDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.CreateCustomer",
              controller: this
            }).then(function (oDialog) {
              this.oDialog = oDialog;
              oView.addDependent(this.oDialog);
              this.oDialog.open();
            }.bind(this));
          } else {
            this.oDialog.open();
          }
        },

        onRadioButtonChange: function () {
          if (sap.ui.getCore().byId("MC_id_groupCustGst").getSelectedIndex() === 0) {
            this.getView().getModel("CreateCustomerModel").setProperty('/Value', '9');
            this.getView().getModel("CreateCustomerModel").setProperty('/Type', "CGST/SGST");
          } else {
            this.getView().getModel("CreateCustomerModel").setProperty('/Value', '18');
            this.getView().getModel("CreateCustomerModel").setProperty('/Type', "IGST");
          }
        },

        MC_ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        MC_ValidateGstNumber: function (oEvent) {
          utils._LCvalidateGstNumber(oEvent);
        },

        MC_ValidateMobileNo: function (oEvent) {
          utils._LCvalidateMobileNumber(oEvent);
        },

        MC_ValidatePanCard: function (oEvent) {
          utils._LCvalidatePanCard(oEvent);
        },

        MC_ValidateEmail: function (oEvent) {
        utils._LCvalidateEmail(oEvent);
        },

        MC_onPressSubmit: function () {
          try {
            if (
              utils._LCvalidateGstNumber(sap.ui.getCore().byId("MC_id_CustomGst"), "ID") &&
              utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCompanyName"), "ID") && 
              utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCustomerName"), "ID") && 
              utils._LCvalidatePanCard(sap.ui.getCore().byId("MC_id_CustomPan"), "ID") &&
              utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_CustMail"), "ID") &&  utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_FinanceEmail"), "ID") &&
              utils._LCvalidateMobileNumber(sap.ui.getCore().byId("MC_id_CustMob"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustAddress"), "ID") ) {
            } else {
                sap.m.MessageToast.show("Make sure all the mandatory fields are filled and validate the entered value");
            }
        } catch (error) {
            sap.m.MessageToast.show("Technical error, please contact the administrator");
        }
      },

        //close the Dialog
        MC_onPressClose: function () {
          this.oDialog.close();
        },

        onPressback: function () {
          this.getOwnerComponent().getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
          this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
        },
      }
    );
  }
);
