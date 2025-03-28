sap.ui.define([
  "./BaseController", //call base controller
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "../utils/validation"
],
  function (BaseController, JSONModel, MessageToast, utils) {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.ManageCustomer", {
      GST_PATTERN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/,
      onInit: function () {
        this.getRouter().getRoute("RouteManageCustomer").attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function (oEvent) {
        this._fetchCommonData("ManageCustomer", "CreateCustomerModel", { });
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this.byId("MC_id_CustTable").removeSelections(true);
        this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("custDetails"));
      },

      //common Dialog Function
      manageCustomerDetails: function (bIsEdit) {
        var oView = this.getView();
        var oModel;
        var data = { save: false, submit: true, CC_id_CustInput: false, selectedIndex: 0 };
        var visibleData = new sap.ui.model.json.JSONModel(data);
        this.getView().setModel(visibleData, "visiblePlay");
        // If editing, get the selected data from the table       
        if (bIsEdit) {
          var oVisiableModel = this.getView().getModel("visiblePlay");
          oVisiableModel.setProperty("/save", true);
          oVisiableModel.setProperty("/submit", false);
          var oTable =  this.byId("MC_id_CustTable").getSelectedItem();
          if (oTable === null) {
            return sap.m.MessageBox.error(this.i18nModel.getText("msgCustomer2"));
          } else {
            var oData =  oTable.getBindingContext("CreateCustomerModel").getObject();
            if (oData.GST) this.getView().getModel("visiblePlay").setProperty("/CC_id_CustInput", true);
            if (oData.type === "IGST") {
              this.getView().getModel("visiblePlay").setProperty("/selectedIndex", 1);
            }
            this.gstValue = oData.value
            oModel = new sap.ui.model.json.JSONModel(oData);
          }
        } else {
          var JSONModel = {
            companyName: "",
            name: "",
            PAN: "",
            GST: "",
            address: "",
            mailID: "",
            mobileNo: "",
            LUT: "",
            type: "",
            value: "0",
            salutation: "Mr.",
            customerEmail: ""
          };
          oModel = new sap.ui.model.json.JSONModel(JSONModel);
        }
        this.getView().setModel(oModel, "CreateCustomerModel");
        // open the dialog
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
          this.getView().getModel("CreateCustomerModel").setProperty('/value', '9');
          this.getView().getModel("CreateCustomerModel").setProperty('/type', "CGST/SGST");
        } else {
          this.getView().getModel("CreateCustomerModel").setProperty('/value', '18');
          this.getView().getModel("CreateCustomerModel").setProperty('/type', "IGST");
        }
      },

      // Call the function for create new Customer
      MC_onAddCustomerDetails: function () {
        this.manageCustomerDetails(false);
      },

      // Call the function for edit Customer
      MC_onEditCustomerDetails: function () {
        this.manageCustomerDetails(true);
      },

      //close the Dialog
      MC_onPressClose: function () {
        this.oDialog.close();
        sap.ui.getCore().byId("MC_id_CustomGst").setValueState("None");
        sap.ui.getCore().byId("MC_id_CustomPan").setValueState("None");
        this.byId("MC_id_CustTable").removeSelections(true)
      },

      MC_ValidateCommonFields: function (oEvent) {
        utils._LCvalidateMandatoryField(oEvent);
      },

      MC_ValidateGstNumber: function (oEvent) {
        var sInputValue = sap.ui.getCore().byId("MC_id_CustomGst").getValue();
        var oInput = sap.ui.getCore().byId("MC_id_CustomGst");
        // Determine which pattern to use based on input field
        var testPattern = this.GST_PATTERN;
        var dataModel = this.getView().getModel("CreateCustomerModel")
        var visiModel = this.getView().getModel("visiblePlay")
        // Validation checking
        if (testPattern.test(sInputValue) && sInputValue) {
          visiModel.setProperty("/CC_id_CustInput", true);
          if (visiModel.getProperty("/selectedIndex") === 1) {
            dataModel.setProperty('/value', '18');
            dataModel.setProperty('/type', "IGST");
          } else {
            dataModel.setProperty('/value', '9');
            dataModel.setProperty('/type', "CGST/SGST");
          }
          oInput.setValueState("None");
        } else if (!sInputValue) {
          dataModel.setProperty('/value', '0');
          dataModel.setProperty('/type', "");
          oInput.setValueState("None");
          visiModel.setProperty("/CC_id_CustInput", false);
        } else {
          visiModel.setProperty("/CC_id_CustInput", false);
          oInput.setValueState("Error");
          oInput.setValueStateText(this.i18nModel.getText("msgCustomer14"));
        }
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
            utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_CustMail"), "ID") && utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_FinanceEmail"), "ID") &&
            utils._LCvalidateMobileNumber(sap.ui.getCore().byId("MC_id_CustMob"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustAddress"), "ID")) {
              var oData = this.getView().getModel("CreateCustomerModel").getData();
              this.ajaxCreateWithJQuery("ManageCustomer", { data: oData });
              this.byId("MC_id_CustTable").removeSelections(true);
              sap.m.MessageToast.show(this.i18nModel.getText("msgCustomer3"));
              this.oDialog.close();
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        } catch (error) {
          MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
        }
      },

      MC_onPressSave:function(){
        try {
          if (
            utils._LCvalidateGstNumber(sap.ui.getCore().byId("MC_id_CustomGst"), "ID") &&
            utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCompanyName"), "ID") &&
            utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCustomerName"), "ID") &&
            utils._LCvalidatePanCard(sap.ui.getCore().byId("MC_id_CustomPan"), "ID") &&
            utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_CustMail"), "ID") && utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_FinanceEmail"), "ID") &&
            utils._LCvalidateMobileNumber(sap.ui.getCore().byId("MC_id_CustMob"), "ID") && utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustAddress"), "ID")) {
              var oData = this.getView().getModel("CreateCustomerModel").getData();
              this.ajaxUpdateWithJQuery("ManageCustomer", { data: oData });
              this.byId("MC_id_CustTable").removeSelections(true);
              this.oDialog.close();
              this._onRouteMatched();
              sap.m.MessageToast.show(this.i18nModel.getText("msgCustomer4"));
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        } catch (error) {
          MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
        }
      },

      MC_onDeleteAddCustomer: function() {
             var oTable = this.byId("MC_id_CustTable").getSelectedItem(); 
             if (!oTable) {
                 return sap.m.MessageBox.error(this.i18nModel.getText("msgCustomer2"));
             }
     
             var oIndex =  oTable.getBindingContext("CreateCustomerModel").getObject();
             var filters = { ID: oIndex.ID };
             this.ajaxDeleteWithJQuery("ManageCustomer", filters);
             this._onRouteMatched();
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
