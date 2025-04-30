sap.ui.define(
  [
    "./BaseController", // Import BaseController
    "../model/formatter", // Custom formatter functions
  ],
  function (BaseController, Formatter) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.Contract",
      {
        Formatter: Formatter,
        onInit: function () {
          this.getRouter().getRoute("RouteContract").attachMatched(this._onRouteMatched, this);
        },
      _onRouteMatched:async function () {
          this.getBusyDialog(); // Show busy dialog
          this.commonLoginFunction("Contract"); // Call common login function
          this.onClearAndSearch("C_id_FilterBar");// Clear and search function
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("contractDetails"));
          try {  
              await this._fetchCommonData("ManageCustomer", "CreateCustomerModel");
              await this._fetchCommonData("Contract", "ContractModel", { startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31` }) // Fetch common data
            } catch (error) {
              sap.m.MessageToast.show(error.message || error.responseText);
            } finally {
              this.closeBusyDialog(); // Close after async call finishes
            }
        },
        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },
        onLogout: function () {
            this.CommonLogoutFunction(); // Navigate to login page
        },
        C_onPressAddContract: function (oEvent) {
          var oParValue, sAgreementNo = "";
          var isCreateMode = oEvent.getSource().getId().lastIndexOf("C_id_AddBtn") !== -1;
          if (isCreateMode) {             // Case: Add new contract
            oParValue = "CreateContractFlag";
            // Navigate only with sParContract (no AgreementNo during create)
            this.getRouter().navTo("RouteContractDetails", {sParContract: oParValue, sID: sAgreementNo || null});
          } else {
            // Case: Edit existing contract
            var oContext = oEvent.getSource().getBindingContext("ContractModel");
            var oData = oContext.getModel().getData()[oContext.getPath().split("/")[1]];
            oParValue = oData.ContractNo;
            sAgreementNo = oData.AgreementNo;
            // Navigate with both ContractNo and AgreementNo
            this.getRouter().navTo("RouteContractDetails", {sParContract: oParValue, sID: sAgreementNo});
          }
        },
        C_onClearFilters: function () {
          const oView = this.getView();
          const oFilterBar = oView.byId("C_id_FilterBar");
          oFilterBar.getFilterGroupItems().forEach((item) => {
            const oControl = item.getControl();
            if (oControl instanceof sap.m.ComboBox || oControl instanceof sap.m.Select) {
              oControl.setSelectedKey(""); // Clear selected key
            } else if (oControl instanceof sap.m.Input) {
              oControl.setValue(""); // Clear input value
            } else if (oControl instanceof sap.m.DateRangeSelection) {
              oControl.setDateValue(null); // Clear date value
              oControl.setSecondDateValue(null); // Clear second date value
            }
          });
        },
        C_onSearch: async function () {
          this.getBusyDialog(); // Show busy dialog
          var aFilterItems = this.byId("C_id_FilterBar").getFilterGroupItems();
          var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern: "yyyy-MM-dd",});
          var params = {};
          aFilterItems.forEach(function (oItem) {
            var oControl = oItem.getControl();
            var sValue = oItem.getName();
            if (oControl && oControl.getValue()) {
              if (sValue === "Year") {
                var oAssignmentStartDate = oControl.getDateValue();
                var oAssignmentEndDate = oControl.getSecondDateValue();
                params["AssignmentStartDate"] =
                  oDateFormat.format(oAssignmentStartDate);
                params["AssignmentEndDate"] =
                  oDateFormat.format(oAssignmentEndDate);
              } else {
                params[sValue] = oControl.getValue();
              }
            }
          });
          try {
            await this._fetchCommonData("Contract", "ContractModel", params);
          } catch (error) {
            sap.m.MessageToast.show(error.message || error.responseText);
          } finally {
            this.closeBusyDialog(); // Close after async call finishes
          }
        },
      }
    );
  }
);
