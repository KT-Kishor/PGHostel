sap.ui.define([
  "./BaseController", //call base controller
  "sap/ui/model/json/JSONModel", //json model
  "sap/m/MessageToast", // Import MessageToast for notifications
  "../utils/validation", //  Import formatter utility
  "sap/m/MessageBox", // Import MessageBox for alerts/confirmations
],
  function (BaseController, JSONModel, MessageToast, utils,MessageBox)  {
    "use strict";
    return BaseController.extend("sap.kt.com.minihrsolution.controller.ManageCustomer", {
      onInit: function () {
        this.getRouter().getRoute("RouteManageCustomer").attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function (oEvent) {
        this._fetchCommonData("ManageCustomer", "CreateCustomerModel", {}); // Fetch customer data
        this.i18nModel = this.getView().getModel("i18n").getResourceBundle(); // Get i18n model
        this.byId("MC_id_CustTable").removeSelections(true); // Clear table selection
        this.getView().getModel("LoginModel").setProperty("/HeaderName", 
        this.i18nModel.getText("headerCustomer")); // Set header name
        this.MC_onSearch(); // Search customer table
      },

        //common Dialog Function
        manageCustomerDetails: function (bIsEdit) {
          var oModel;
          var data = {save: false, submit: true, CC_id_CustInput: false, selectedIndex: 0};
          var visibleData = new JSONModel(data); // Create a new JSON model for visibility
          this.getView().setModel(visibleData, "visiblePlay");
          if (bIsEdit) {
              var oVisiableModel = this.getView().getModel("visiblePlay");
              oVisiableModel.setProperty("/save", true); // Set save button visibility
              oVisiableModel.setProperty("/submit", false); // Set submit button visibility
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
              this._originalCustomerData = null; // Reset original data
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
          if (!this.oManageCustomerDialog) {
              sap.ui.core.Fragment.load({
                  name: "sap.kt.com.minihrsolution.fragment.CreateCustomer",
                  controller: this,
              }).then(
                  function (oManageCustomerDialog) {
                      this.oManageCustomerDialog = oManageCustomerDialog;
                      this.getView().addDependent(this.oManageCustomerDialog);
                      this._resetDialogFields(bIsEdit); // Reset fields to original data
                      this.oManageCustomerDialog.open(); // Open the dialog
                  }.bind(this)
              );
          } else {
              this._resetDialogFields(bIsEdit); // Reset fields to original data
              this.oManageCustomerDialog.open(); // Open the dialog
          }
      },
      
      _resetDialogFields: function (bIsEdit) {
          sap.ui.getCore().byId("MC_id_CustCompanyName").setValueState("None"); // Clear error state
          sap.ui.getCore().byId("MC_id_CustCustomerName").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustomGst").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustomPan").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustMail").setValueState("None");
          sap.ui.getCore().byId("MC_id_FinanceEmail").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustMob").setValueState("None");
          sap.ui.getCore().byId("MC_id_CustAddress").setValueState("None");
          if (bIsEdit && this._originalCustomerData) {
          this.getView().getModel("CustomerModel").setData(JSON.parse(JSON.stringify(this._originalCustomerData)));} // Reset fields to original data
      },
      
        MC_onPressClose: function () {
            this.oManageCustomerDialog.close(); // Close the dialog
            this.byId("MC_id_CustTable").removeSelections(true); // Clear table selection
            this.MC_onTableSelectionChange(); // Update button states
        },

        onRadioButtonChange: function () {
          // Get selected index of the radio button group (0 = CGST/SGST, 1 = IGST)
          const isCGST = sap.ui.getCore().byId("MC_id_groupCustGst").getSelectedIndex() === 0;
          const model = this.getView().getModel("CustomerModel");
          // Set GST value and type based on selected option
          model.setProperty("/value", isCGST ? "9" : "18"); // 9% for CGST/SGST, 18% for IGST
          model.setProperty("/type", isCGST ? "CGST/SGST" : "IGST");
        },
        
        // Call the function for create new Customer
        MC_onAddCustomerDetails: function () {
          this.manageCustomerDetails(false);
        },

        // Call the function for edit Customer
        MC_onEditCustomerDetails: function () {
          this.manageCustomerDetails(true);
        },

         // Validate Common Fields on Input
        MC_ValidateCommonFields: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidateMandatoryField(oEvent);
          if (oInput.getValue()==="") oInput.setValueState("None"); // Clear error state on empty input
        },

        // Validate LUT Number on Input
        MC_ValidateLUTNo: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidateLutNumber(oEvent);
          if (oInput.getValue()==="") oInput.setValueState("None"); // Clear error state on empty input
        },

        // Validate GST Number on Input
        MC_ValidateGstNumber: function (oEvent) {
          // Get input field and its value
          const oInput = sap.ui.getCore().byId("MC_id_CustomGst");
          const sInputValue = oInput.getValue();
          // Get models
          const dataModel = this.getView().getModel("CustomerModel");
          const visiModel = this.getView().getModel("visiblePlay");
          // GST regex pattern
          const testPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{1}Z[0-9A-Z]{1}$/;
          // Case: Valid GST Number
          if (testPattern.test(sInputValue) && sInputValue) {
            visiModel.setProperty("/CC_id_CustInput", true);
            // Set tax values based on selected index
            const isIGST = visiModel.getProperty("/selectedIndex") === 1;
            dataModel.setProperty("/value", isIGST ? "18" : "9");
            dataModel.setProperty("/type", isIGST ? "IGST" : "CGST/SGST");
            oInput.setValueState("None");
          // Case: Empty input
          } else if (!sInputValue) {
            dataModel.setProperty("/value", "0");
            dataModel.setProperty("/type", "");
            oInput.setValueState("None");
            visiModel.setProperty("/CC_id_CustInput", false);
          // Case: Invalid GST format
          } else {
            visiModel.setProperty("/CC_id_CustInput", false);
            oInput.setValueState("Error");
            oInput.setValueStateText(this.i18nModel.getText("gstNoValueState"));
          }
        },
        
        // Validate Mobile Number on Input
        MC_ValidateMobileNo: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidateMobileNumber(oEvent);
          if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        // Validate PAN Card on Input
        MC_ValidatePanCard: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidatePanCard(oEvent);
          if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        // Validate Email on Input
        MC_ValidateEmail: function (oEvent) {
          var oInput = oEvent.getSource();
          utils._LCvalidateEmail(oEvent);
          if (oInput.getValue() === "") oInput.setValueState("None"); // Clear error state on empty input
        },

        // Submit Customer Data
        MC_onPressSubmit: async function () {
          try {
            // Validate Mandatory Fields
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
            // Optional Field Validations
            if (oData.PAN && !utils._LCvalidatePanCard(sap.ui.getCore().byId("MC_id_CustomPan"), "ID")) isValid = false;
            if (oData.GST && !utils._LCvalidateGstNumber(sap.ui.getCore().byId("MC_id_CustomGst"), "ID")) isValid = false;
            if (oData.mobileNo && !utils._LCvalidateMobileNumber(sap.ui.getCore().byId("MC_id_CustMob"), "ID")) isValid = false;
            if (oData.LUT && !utils._LCvalidateLutNumber(sap.ui.getCore().byId("MC_id_LUTNo"), "ID")) isValid = false;
            if (!isValid) {
              MessageToast.show(this.i18nModel.getText("mandetoryChecks"));
              return;
            }
            // Submit data 
            var response = await this.ajaxCreateWithJQuery("ManageCustomer", { data: oData });
            if (response.success === true) {
              MessageToast.show(this.i18nModel.getText("msgCustomer3"));
              this.oManageCustomerDialog.close();
              this._fetchCommonData("ManageCustomer", "CreateCustomerModel", {});
            } else {
              MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            }
          } catch (error) {
            MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
          }
        },

        // Save Edited Customer
        MC_onPressSave: async function () {
          try {
            // Validate Mandatory Fields
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
            // Ensure a customer is selected
            if (!oSelectedItem) {
              MessageToast.show(this.i18nModel.getText("selectCustomerToUpdate"));
              return;
            }
            var sCustomerId = oSelectedItem.getBindingContext("CreateCustomerModel").getProperty("ID");
            var isValid = true;
            // Optional Field Validations
            if (oUpdatedData.PAN && !utils._LCvalidatePanCard(sap.ui.getCore().byId("MC_id_CustomPan"), "ID")) isValid = false;
            if (oUpdatedData.GST && !utils._LCvalidateGstNumber(sap.ui.getCore().byId("MC_id_CustomGst"), "ID")) isValid = false;
            if (oUpdatedData.mobileNo && !utils._LCvalidateMobileNumber(sap.ui.getCore().byId("MC_id_CustMob"), "ID")) isValid = false;
            if (oUpdatedData.LUT && !utils._LCvalidateLutNumber(sap.ui.getCore().byId("MC_id_LUTNo"), "ID")) isValid = false;
            if (!isValid) {
              MessageToast.show(this.i18nModel.getText("mandetoryChecks"));
              return;
            }
            // Send update request
            var requestData = { filters: { ID: sCustomerId }, data: oUpdatedData };
            var response = await this.ajaxUpdateWithJQuery("/ManageCustomer", requestData);
            if (response.success === true) {
              oTable.removeSelections(true);
              this.oManageCustomerDialog.close();
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

        // Delete Selected Customer
        MC_onDeleteAddCustomer: function () {
          var oTable = this.byId("MC_id_CustTable");
          var oSelectedItem = oTable.getSelectedItem();
          if (!oSelectedItem) {
              MessageBox.error(this.i18nModel.getText("deleteCustomer"));
              return;
          }
          var sCustomerID = oSelectedItem.getBindingContext("CreateCustomerModel").getProperty("ID");
          var that = this;
          // Use common confirmation dialog
          this.showConfirmationDialog(
              this.i18nModel.getText("msgBoxConfirm"), // Dialog title
              this.i18nModel.getText("confirmDeleteCustomerMessage"), // Dialog message
              // onConfirm callback
              function () {
                  that.ajaxDeleteWithJQuery("/ManageCustomer", { filters: { ID: sCustomerID } }).then(() => {
                      MessageToast.show(that.i18nModel.getText("msgCustomerDeleteSuccess"));
                      that.MC_onClear();
                      that._fetchCommonData("ManageCustomer", "CreateCustomerModel", {});
                      that.byId("MC_id_AddCustomer").setEnabled(true);
                  }).catch((error) => {
                      MessageToast.show(error.responseText);
                  });
              },
              // onCancel callback
              function () {
                  that.byId("MC_id_CustTable").removeSelections(true);
                  that.MC_onTableSelectionChange();
              }
          );
        },
      
        // Clear Customer Form Selection
        MC_onClear: function () {
          var oComboBox = this.getView().byId("MC_id_CompanyName");
          if (oComboBox) oComboBox.setSelectedKey(""); // Clear combo box selection
        },

        // Search Customer Table by Filter Bar Values
        MC_onSearch: function (oEvent) {
          var oFilterBar = oEvent.getSource();
          var aFilterItems = oFilterBar.getFilterGroupItems();
          var params = {};
          aFilterItems.forEach(function (oItem) {
            var oControl = oItem.getControl();
            if (oControl && oControl.getValue) {
              var sKey = oItem.getName();
              var sValue = oControl.getValue();
              if (sValue) params[sKey] = sValue;
            }
          });
          this.byId("MC_id_CustTable").removeSelections(true);
          this.MC_onTableSelectionChange();
          this._fetchCommonData("ManageCustomer", "CreateCustomerModel", params);
        },

        // Handle Table Row Selection - Enable/Disable Buttons
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
          this.getRouter().navTo("RouteTilePage"); // Navigate Back to Tile Page
        },

        onLogout: function () {
          this.getRouter().navTo("RouteLoginPage"); // Navigate to Login Page
        }
      }
    );
  }
);
