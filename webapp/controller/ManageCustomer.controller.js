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
      GST_PATTERN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{1}[Z][0-9A-Z]{1}$/,
      onInit: function () {
        this.getRouter().getRoute("RouteManageCustomer").attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function (oEvent) {
        this._fetchCommonData("ManageCustomer", "CreateCustomerModel", {});
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
        this.byId("MC_id_CustTable").removeSelections(true);
        this.MC_onTableSelectionChange();
        this.getView().getModel("LoginModel").setProperty("/HeaderName", 
        this.i18nModel.getText("headerCustomer"));
        this.MC_onSearch();
      },

        //common Dialog Function
        manageCustomerDetails: function (bIsEdit) {
          var oModel;
          var data = {save: false, submit: true, CC_id_CustInput: false, selectedIndex: 0};
          var visibleData = new JSONModel(data);
          this.getView().setModel(visibleData, "visiblePlay");
          if (bIsEdit) {
              var oVisiableModel = this.getView().getModel("visiblePlay");
              oVisiableModel.setProperty("/save", true);
              oVisiableModel.setProperty("/submit", false);
              var oTable = this.byId("MC_id_CustTable").getSelectedItem();
              if (oTable === null) {
                  return MessageBox.error(this.i18nModel.getText("msgCustomer2"));
              } else {
            var oData = oTable.getBindingContext("CreateCustomerModel").getObject();
            this._originalCustomerData = JSON.parse(JSON.stringify(oData));
                  if (oData.GST)
                      this.getView().getModel("visiblePlay").setProperty("/CC_id_CustInput", true);
                  if (oData.type === "IGST") {
                      this.getView().getModel("visiblePlay").setProperty("/selectedIndex", 1);
                  }
                  this.gstValue = oData.value;
                  oModel = new JSONModel(oData);
              }
          } else {
              this._originalCustomerData = null;
              var oData = {
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
          if (!this.oDialog) {
              sap.ui.core.Fragment.load({
                  name: "sap.kt.com.minihrsolution.fragment.CreateCustomer",
                  controller: this,
              }).then(
                  function (oDialog) {
                      this.oDialog = oDialog;
                      this.getView().addDependent(this.oDialog);
                      this._resetDialogFields(bIsEdit); 
                      this.oDialog.open();
                  }.bind(this)
              );
          } else {
              this._resetDialogFields(bIsEdit);
              this.oDialog.open();
          }
      },
      
      _resetDialogFields: function (bIsEdit) {
          sap.ui.getCore().byId("MC_id_CustCompanyName").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustCustomerName").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustomGst").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustomPan").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustMail").setValueState("None");
          sap.ui.getCore().byId("MC_id_FinanceEmail").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustMob").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustAddress").setValueState("None");
          if (bIsEdit && this._originalCustomerData) {
          this.getView().getModel("CustomerModel").setData(JSON.parse(JSON.stringify(this._originalCustomerData)));}
      },
      
        MC_onPressClose: function () {
            var oVisibleModel = this.getView().getModel("visiblePlay");
            var bIsEdit = oVisibleModel.getProperty("/save");
            this._resetDialogFields(bIsEdit);
            this.oDialog.close();
            this.byId("MC_id_CustTable").removeSelections(true);
            this.MC_onTableSelectionChange();
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
            oInput.setValueStateText(this.i18nModel.getText("gstNoValueState"));
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
            var oCustomerModel = this.getView().getModel("CustomerModel");
            var oUpdatedData = oCustomerModel.getData();
            var oTable = this.byId("MC_id_CustTable");
            var oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                MessageToast.show(this.i18nModel.getText("selectCustomerToUpdate"));
                return; 
            }
            var sCustomerId = oSelectedItem.getBindingContext("CreateCustomerModel").getProperty("ID");
            var isValid = true;
            if (oUpdatedData.PAN && !utils._LCvalidatePanCard(sap.ui.getCore().byId("MC_id_CustomPan"), "ID")) { isValid = false}
            if (oUpdatedData.GST && !utils._LCvalidateGstNumber(sap.ui.getCore().byId("MC_id_CustomGst"), "ID")) {  isValid = false}
            if (oUpdatedData.mobileNo && !utils._LCvalidateMobileNumber(sap.ui.getCore().byId("MC_id_CustMob"), "ID")) { isValid = false }
            if (oUpdatedData.LUT && !utils._LCvalidateLutNumber(sap.ui.getCore().byId("MC_id_LUTNo"), "ID")) { isValid = false}
            if (!isValid) {
                MessageToast.show(this.i18nModel.getText("mandetoryChecks"));
                return;
            }
            var requestData = {filters: { ID: sCustomerId }, data: oUpdatedData};
            var response = await this.ajaxUpdateWithJQuery("/ManageCustomer", requestData);
            if (response.success === true) {
                oTable.removeSelections(true);
                this.oDialog.close();
                MessageToast.show(this.i18nModel.getText("msgCustomer4"));
                this.MC_onTableSelectionChange();
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
      var oDialog = new sap.m.Dialog({
          title: this.i18nModel.getText("msgBoxConfirm"),
          type: sap.m.DialogType.Message,
          icon: "sap-icon://warning",
          state: sap.ui.core.ValueState.Warning,
          content: new sap.m.Text({
            text: this.i18nModel.getText("confirmDeleteCustomerMessage")
          }),
          beginButton: new sap.m.Button({
              text: this.i18nModel.getText("OkButton"),
              type: sap.m.ButtonType.Accept,
              press: function () {
              oDialog.close();
              that.ajaxDeleteWithJQuery("/ManageCustomer", { filters: { ID: sCustomerID } }).then(() => {
              MessageToast.show(that.i18nModel.getText("msgCustomerDeleteSuccess"));
              that.MC_onClear();
              that._fetchCommonData("ManageCustomer","CreateCustomerModel",{});
              that.byId("MC_id_AddCustomer").setEnabled(true);
            }).catch((error) => {
              MessageToast.show(error.responseText);
            });
          }
          }),
          endButton: new sap.m.Button({
          text:  this.i18nModel.getText("CancelButton"),
          type: sap.m.ButtonType.Reject,
          press: function () {
            oDialog.close();
            that.byId("MC_id_CustTable").removeSelections(true);
            that.MC_onTableSelectionChange();
          }
          }),
          afterClose: function () {
              oDialog.destroy();
          }
      });
      oDialog.open();
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
          this.byId("MC_id_CustTable").removeSelections(true);
          this.MC_onTableSelectionChange();
          this._fetchCommonData("ManageCustomer","CreateCustomerModel",params);  
        },

        MC_onTableSelectionChange: function () {
          var aSelectedItems = this.byId("MC_id_CustTable").getSelectedItems();
          if (aSelectedItems.length > 0) { 
              this.byId("MC_id_AddCustomer").setEnabled(false);
              this.byId("MC_id_EditCustomer").setEnabled(true);
              this.byId("MC_id_DeleteCustomer").setEnabled(true);
          } else {
              this.byId("MC_id_AddCustomer").setEnabled(true);
              this.byId("MC_id_EditCustomer").setEnabled(true);
              this.byId("MC_id_DeleteCustomer").setEnabled(true);
          }
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
