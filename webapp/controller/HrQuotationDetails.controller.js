sap.ui.define(
    [
      "./BaseController", //import base controller
      "../utils/validation"
    ],
    function (BaseController,utils) {
      "use strict";
  
      return BaseController.extend("sap.kt.com.minihrsolution.controller.RouteHrQuotationDetails", {
  
        onInit: function () {
          this.getRouter().getRoute("RouteHrQuotationDetails").attachMatched(this._onRouteMatched, this);
        },

        HQD_onBack:function(){
          this.getRouter().navTo("RouteHrQuotation");
        },

        // _checkValidation:function(){
        //   if(
        //     utils._LCvalidateDate(this.byId("HQD_id_Quotation"),"ID") &&
        //     utils._LCvalidateDate(this.byId("HQD_id_QuotationValid"),"ID") &&

        //   )
        // },

        HQD_DateValidate:function(oEvent){
          utils._LCvalidateDate(oEvent)
        },

        HQD_LastDate:function(oEvent){
          utils._LCvalidateDate(oEvent)
        },

        HQD_onNameLiveChange:function(oEvent){
          utils._LCvalidateMandatoryField(oEvent)
        },

        HQD_onMNumberLiveChange:function(oEvent){
          utils._LCvalidateMobileNumber(oEvent);
        },

        HQD_EmailIDLiveChange:function(oEvent){
          utils._LCvalidateEmail(oEvent)
        },

        HQD_onAddressLiveChange:function(oEvent){
          utils._LCvalidateMandatoryField(oEvent)
        },

        HQD_onComGSTLiveChange:function(oEvent){
          utils._LCvalidateGstNumber(oEvent)
        },

        HQD_onCurrencyChange:function(oEvent){
          utils._LCstrictValidationComboBox(oEvent)
        },

        HQD_onCustomerNameLiveChange:function(oEvent){
          utils._LCvalidateMandatoryField(oEvent)
        },

        HQD_EmailIDLiveChange:function(oEvent){
          utils._LCvalidateEmail(oEvent)
        },

        HQD_onMNumberLiveChange:function(oEvent){
          utils._LCvalidateMobileNumber(oEvent);
        },

        HQD_onAddressLiveChange:function(oEvent){
          utils._LCvalidateMandatoryField(oEvent)
        },

        HQD_onComGSTLiveChange:function(oEvent){
          utils._LCvalidateGstNumber(oEvent)
        },

        HQD_onPressSubmit:function(){
          try {
            if (
                utils._LCvalidateDate(this.byId("HQD_id_Quotation"), "ID") &&
                utils._LCvalidateDate(this.byId("HQD_id_QuotationValid"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyName"), "ID") &&
                utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCompanyMobileNo"), "ID") &&
                utils._LCvalidateEmail(this.byId("HQD_id_CompanyEmailID"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCompanyAddress"), "ID") &&
                utils._LCvalidateGstNumber(this.byId("HQD_id_CompGSTNO"), "ID") &&
                utils._LCstrictValidationComboBox(this.byId("HQD_id_Curency"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("HQD_id_CustomerName"), "ID") &&
                utils._LCvalidateEmail(this.byId("HQD_id_CustomerEmailID"), "ID") &&
                utils._LCvalidateMobileNumber(this.byId("HQD_id_InputCustomerMobileNo"), "ID") &&
                utils._LCvalidateMandatoryField(this.byId("HQD_id_InputCustomerAddress"), "ID") &&
                utils._LCvalidateGstNumber(this.byId("HQD_id_InputCustomerGSTNO"), "ID")) {
            } else {
              MessageToast.show(this.i18nModel.getText("mandetoryFields"));
            }
        } catch (error) {
          MessageToast.show(this.i18nModel.getText("commonErrorMessage"));
        }
        }
      }
    
      )
  });