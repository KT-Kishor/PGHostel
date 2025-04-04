sap.ui.define([
  "./BaseController", //call base controller
  "sap/ui/model/json/JSONModel", //json model
  "sap/m/MessageToast",
  "../utils/validation",
  "sap/m/MessageBox"
],
  function (BaseController, JSONModel, MessageToast, utils,MessageBox)  {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.ManageCustomer", {
      GST_PATTERN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/,
      onInit: function () {
        this.getRouter().getRoute("RouteManageCustomer").attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function (oEvent) {
        this._fetchCommonData("ManageCustomer", "CreateCustomerModel", {});
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this.byId("MC_id_CustTable").removeSelections(true);
        this.getView().getModel("LoginModel").setProperty("/HeaderName", 
        this.i18nModel.getText("headerCustomer"));
        this.MC_onSearch();
      },

        //common Dialog Function
        manageCustomerDetails: function (bIsEdit) {
          var oModel;
          var data = {save: false,submit: true, CC_id_CustInput: false, selectedIndex: 0,};
          var visibleData = new JSONModel(data);
          this.getView().setModel(visibleData, "visiblePlay");
          // If editing, get the selected data from the table
          if (bIsEdit) {
            var oVisiableModel = this.getView().getModel("visiblePlay");
            oVisiableModel.setProperty("/save", true);
            oVisiableModel.setProperty("/submit", false);
            var oTable = this.byId("MC_id_CustTable").getSelectedItem();
            if (oTable === null) {
              return MessageBox.error(this.i18nModel.getText("msgCustomer2"));
            } else {
              var oData = oTable.getBindingContext("CreateCustomerModel").getObject();
              if (oData.GST)
                this.getView().getModel("visiblePlay").setProperty("/CC_id_CustInput", true);
              if (oData.type === "IGST") {
                this.getView().getModel("visiblePlay").setProperty("/selectedIndex", 1);
              }
              this.gstValue = oData.value;
              oModel = new JSONModel(oData);
            }
          } else {
            var oData  = {
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
              customerEmail: "",
            };
            oModel = new JSONModel(oData);
          }
          this.getView().setModel(oModel, "CustomerModel");
          // open the dialog
          if (!this.oDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.CreateCustomer",
              controller: this,
            }).then(
              function (oDialog) {
                this.oDialog = oDialog;
                this.getView().addDependent(this.oDialog);
                this._resetDialogFields(); // Reset values
                this.oDialog.open();
              }.bind(this)
            );
          } else {
            this._resetDialogFields(); // Reset values
            this.oDialog.open();
          }
        },

        onRadioButtonChange: function () {
          if (
            sap.ui.getCore().byId("MC_id_groupCustGst").getSelectedIndex() === 0
          ) {
            this.getView().getModel("CustomerModel").setProperty("/value", "9");
            this.getView().getModel("CustomerModel").setProperty("/type", "CGST/SGST");
          } else {
            this.getView().getModel("CustomerModel").setProperty("/value", "18");
            this.getView().getModel("CustomerModel").setProperty("/type", "IGST");
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

        _resetDialogFields: function () {
          sap.ui.getCore().byId("MC_id_CustCompanyName").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustCustomerName").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustomGst").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustomPan").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustMail").setValueState("None");
          sap.ui.getCore().byId("MC_id_FinanceEmail").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustMob").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustAddress").setValueState("None");
        },

        MC_onPressClose: function () {
          this._resetDialogFields(); // Reset values
          this.oDialog.close();
          this.byId("MC_id_CustTable").removeSelections(true);
        },

        MC_ValidateCommonFields: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidateMandatoryField(oEvent);
          if (oInput.getValue()==="") oInput.setValueState("None");
        },

        MC_ValidateLUTNo: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidateLutNumber(oEvent);
          if (oInput.getValue()==="") oInput.setValueState("None");
        },

        MC_ValidateGstNumber: function (oEvent) {
          var sInputValue = sap.ui.getCore().byId("MC_id_CustomGst").getValue();
          var oInput = sap.ui.getCore().byId("MC_id_CustomGst");
          var testPattern = this.GST_PATTERN;
          var dataModel = this.getView().getModel("CustomerModel");
          var visiModel = this.getView().getModel("visiblePlay");
          if (testPattern.test(sInputValue) && sInputValue) {
            visiModel.setProperty("/CC_id_CustInput", true);
            if (visiModel.getProperty("/selectedIndex") === 1) {
              dataModel.setProperty("/value", "18");
              dataModel.setProperty("/type", "IGST");
            } else {
              dataModel.setProperty("/value", "9");
              dataModel.setProperty("/type", "CGST/SGST");
            }
            oInput.setValueState("None");
          } else if (!sInputValue) {
            dataModel.setProperty("/value", "0");
            dataModel.setProperty("/type", "");
            oInput.setValueState("None");
            visiModel.setProperty("/CC_id_CustInput", false);
          } else {
            visiModel.setProperty("/CC_id_CustInput", false);
            oInput.setValueState("Error");
            oInput.setValueStateText(this.i18nModel.getText("msgCustomer14"));
          }
        },

        MC_ValidateMobileNo: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidateMobileNumber(oEvent);
          if (oInput.getValue()==="") oInput.setValueState("None");
        },
      
        MC_ValidatePanCard: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidatePanCard(oEvent);
          if (oInput.getValue()==="") oInput.setValueState("None"); 
        },

        MC_ValidateEmail: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidateEmail(oEvent);
          if (oInput.getValue()==="") oInput.setValueState("None");
        },

        MC_onPressSubmit: async function () {
          try {
              var isMandatoryValid = (
                  utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCompanyName"), "ID") &&
                  utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCustomerName"), "ID") &&
                  utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_CustMail"), "ID") &&
                  utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_FinanceEmail"), "ID") &&
                  utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustAddress"), "ID")
              );
              if (!isMandatoryValid) {
                  MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                  return; 
              }
              var oData = this.getView().getModel("CustomerModel").getData();
              var isValid = true;
              if (oData.PAN && !utils._LCvalidatePanCard(sap.ui.getCore().byId("MC_id_CustomPan"), "ID")) { isValid = false; }
              if (oData.GST && !utils._LCvalidateGstNumber(sap.ui.getCore().byId("MC_id_CustomGst"), "ID")) { isValid = false; }
              if (oData.mobileNo && !utils._LCvalidateMobileNumber(sap.ui.getCore().byId("MC_id_CustMob"), "ID")) { isValid = false; }
              if (oData.LUT && !utils._LCvalidateLutNumber(sap.ui.getCore().byId("MC_id_LUTNo"), "ID")) { isValid = false; }
              if (!isValid) {
                  MessageToast.show(this.i18nModel.getText("mandetoryChecks"));
                  return; 
              }
              var response = await this.ajaxCreateWithJQuery("ManageCustomer", { data: oData });
              if (response.success === true) {
                  MessageToast.show(this.i18nModel.getText("msgCustomer3"));
                  this.oDialog.close();
                  this._fetchCommonData("ManageCustomer", "CreateCustomerModel", {});
              } else {
                  MessageToast.show(this.i18nModel.getText("mandetoryFields"));
              }
          } catch (error) {
              MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          }
      },
      
      MC_onPressSave: async function () {
        try {
            var isMandatoryValid = (
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCompanyName"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustCustomerName"), "ID") &&
                utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_CustMail"), "ID") &&
                utils._LCvalidateEmail(sap.ui.getCore().byId("MC_id_FinanceEmail"), "ID") &&
                utils._LCvalidateMandatoryField(sap.ui.getCore().byId("MC_id_CustAddress"), "ID")
            );
            if (!isMandatoryValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
                return;
            }
            var oTable = this.byId("MC_id_CustTable");
            var oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                MessageToast.show(this.i18nModel.getText("selectCustomerToUpdate"));
                return; 
            }
            var oData = oSelectedItem.getBindingContext("CreateCustomerModel").getObject();
            var isValid = true;
            if (oData.PAN && !utils._LCvalidatePanCard(sap.ui.getCore().byId("MC_id_CustomPan"), "ID")) { isValid = false; }
            if (oData.GST && !utils._LCvalidateGstNumber(sap.ui.getCore().byId("MC_id_CustomGst"), "ID")) { isValid = false; }
            if (oData.mobileNo && !utils._LCvalidateMobileNumber(sap.ui.getCore().byId("MC_id_CustMob"), "ID")) { isValid = false; }
            if (oData.LUT && !utils._LCvalidateLutNumber(sap.ui.getCore().byId("MC_id_LUTNo"), "ID")) { isValid = false; }
            if (!isValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryChecks"));
                return;
            }
            var requestData = {filters: { ID: oSelectedItem.getBindingContext("CreateCustomerModel").getProperty("ID") },data: oSelectedItem.getBindingContext("CreateCustomerModel").getObject()};
            var response = await this.ajaxUpdateWithJQuery("/ManageCustomer", requestData);
            if (response.success === true) {
                oTable.removeSelections(true);
                this.oDialog.close();
                MessageToast.show(this.i18nModel.getText("msgCustomer4"));
                this._fetchCommonData("ManageCustomer", "CreateCustomerModel", {});
            } else {
                MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            }
        } catch (error) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
        }
     },
    
      MC_onDeleteAddCustomer: function () {
        var oTable = this.byId("MC_id_CustTable");
        var oSelectedItem = oTable.getSelectedItem();
        if (!oSelectedItem) {
            MessageBox.error(this.i18nModel.getText("deleteCustomer"));
            return;
        }
        var sCustomerID = oSelectedItem.getBindingContext("CreateCustomerModel").getProperty("ID");
        var that = this;
        MessageBox.confirm(
          this.i18nModel.getText("confirmDeleteCustomerMessage"), 
          {
              title: this.i18nModel.getText("msgBoxConfirm"),
              actions: [MessageBox.Action.YES, MessageBox.Action.NO],
              onClose: function(action) {
                  if (action === MessageBox.Action.YES) {
                that.ajaxDeleteWithJQuery("/ManageCustomer", { filters: { ID: sCustomerID } }).then(() => {
                MessageToast.show(that.i18nModel.getText("msgCustomerDeleteSuccess"));
                that._fetchCommonData("ManageCustomer", "CreateCustomerModel", {});
                }).catch((error) => {
                  MessageToast.show(error.responseText);
              });
            }
          }
        });
     },
    
     MC_onClear: function () {
          var oComboBox = this.getView().byId("MC_id_CompanyName");
          if (oComboBox) {
            oComboBox.setSelectedKey(""); // Clears selected key
          }
     },

     MC_onSearch: function (oEvent) {
          var oFilterBar = oEvent.getSource();
          var aFilterItems = oFilterBar.getFilterGroupItems();
          var params = {};
          aFilterItems.forEach(function (oItem) {
            var oControl = oItem.getControl(); 
            if (oControl && oControl.getValue) {
              var sKey = oItem.getName(); 
              var sValue = oControl.getValue(); 
              if (sValue) {
                params[sKey] = sValue; 
              }
            }
          });
          this._fetchCommonData("ManageCustomer","CreateCustomerModel",params);
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
