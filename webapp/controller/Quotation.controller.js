sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (BaseController) => {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.Quotation", {
        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("RouteQuotation").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {},

        Q_onPressback: function () {
            this.getOwnerComponent().getRouter().navTo("RouteTilePage");
        },

        Q_onLogout: function () {
            this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
        },

        Q_onPressDashboard: function () {
            this.getOwnerComponent().getRouter().navTo("RouteDashboard");
        },

        Q_onPressCreate: function () {
            this.getOwnerComponent().getRouter().navTo("RouteQuotationForm");
        },

        Q_onFilterPinChange: function () {
          var data = this.getView().byId("Q_id_FilterPinCode");
          var sValue = data.getValue();
          if (sValue.length > 6) {
            sValue = sValue.slice(0, 6);
            data.setValue(sValue);
          }
        },
    });
});