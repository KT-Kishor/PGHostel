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
        _onRouteMatched: async function () {
          var LoginFUnction = await this.commonLoginFunction("ConsultantInvoice");
          if (!LoginFUnction) return;
          // Get i18n resource bundle
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          // Set header name in LoginModel
          this.getView().getModel("LoginModel").setProperty("/HeaderName", this.i18nModel.getText("consultantInvoice"));
          this.ContractReadCall();
        },
        
      ContractReadCall: async function () {
              try {
                  var oView = this.getView();
                  var userData = this.getOwnerComponent().getModel("LoginModel").getData();
                  var filterObj = {};

                  if (userData.Role === "Contractor") {
                      oView.byId("CI_filterItem_EmployeeID").setVisible(false); // hide entire FilterGroupItem
                      filterObj = {
                          EmployeeID: userData.EmployeeID
                      };
                  } else if (userData.Role === "Admin" || userData.Role === "Account Manager") {
                      oView.byId("CI_filterItem_EmployeeID").setVisible(true);
                      filterObj = {}; // fetch all
                      this.logindata();
                  } else {
                      oView.byId("CI_filterItem_EmployeeID").setVisible(true);
                      filterObj = {
                          EmployeeID: userData.EmployeeID
                      };
                      this.logindata();
                  }

                  this.getBusyDialog(); // Open custom BusyDialog

                  await this.ajaxReadWithJQuery("ConsultantInvoice", filterObj).then(function (oData) {
                      sap.ui.core.BusyIndicator.hide();
                      var oConsultantModel = new sap.ui.model.json.JSONModel(oData.data);
                      this.getView().setModel(oConsultantModel, "ConsultantModel");
                      this.closeBusyDialog(); // Close custom BusyDialog
                  }.bind(this)).catch(function (error) {
                      this.closeBusyDialog(); // Close custom BusyDialog
                    MessageToast.show(error.message || error.responseText);
                  });

              } catch (error) {
                  this.closeBusyDialog(); // Ensure the BusyDialog is closed even on exception
                MessageToast.show(error.message || error.responseText);
              }
          },

          logindata: async function () {
              try {
                  await this.ajaxReadWithJQuery("AllLoginDetails", "EmpModel").then((data) => {
                      if (data.success) {
                          const filteredData = data.data.filter(emp => emp.Role !== 'Trainee');
                          var oModel = new sap.ui.model.json.JSONModel();
                          oModel.setData(filteredData);
                          this.getView().setModel(oModel, "EmpModel");
                      }
                  }).catch((error) => {
                    MessageToast.show(error.message || error.responseText);
                  });
              } catch (error) {
                MessageToast.show(error.message || error.responseText);
              }
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

         CI_onClearFilters: function () {
          const oFilterBar = this.getView().byId("CI_id_ConsultantInvoiceFilterBar");
          oFilterBar.getFilterGroupItems().forEach((oItem) => {
              const oControl = oItem.getControl();
              if (oControl) {
                  if (oControl.isA("sap.m.ComboBox")) {
                      oControl.setSelectedKey("");
                  } else if (oControl.setValue) {
                      oControl.setValue("");
                  }
              }
          });
      },

      CI_OnSearch: async function () {
        this.getBusyDialog(); // Show busy dialog

        const oFilterBar = this.byId("CI_id_ConsultantInvoiceFilterBar");
        const aFilterItems = oFilterBar.getFilterGroupItems();
        const params = {};

        aFilterItems.forEach(function (oItem) {
          const oControl = oItem.getControl();
          const sParamKey = oItem.getName();

          if (oControl) {
            if (oControl.isA("sap.m.ComboBox")) {
              const selectedKey = oControl.getSelectedKey();
              if (selectedKey) {
                params[sParamKey] = selectedKey;
              }
            } else if (oControl.getValue && oControl.getValue()) {
              params[sParamKey] = oControl.getValue();
            }
          }
        });

        try {
          const oData = await this.ajaxReadWithJQuery("ConsultantInvoice", params);
          if (oData && Array.isArray(oData.data)) {
            const oModel = new sap.ui.model.json.JSONModel(oData.data); 
            this.getView().setModel(oModel, "ConsultantModel");
          } 
        } catch (error) {
          sap.m.MessageToast.show(error.message || (error.responseText));
        } finally {
          this.closeBusyDialog(); // Hide busy dialog
        }
      }
      }
    );
  }
);
