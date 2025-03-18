sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel", //json model
  ],
  function ( BaseController, JSONModel) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.Listofholidays",
      {
        onInit: function () {
          var oYearModel = new JSONModel({selectedYear: new Date().getFullYear(), });
          this.getView().setModel(oYearModel, "yearModel");
          this.getRouter().getRoute("RouteListofholidays").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function (oEvent) {
          this.YearData = oEvent.getParameter("arguments").Year;
          var oYearModel = this.getView().getModel("yearModel");
          if (this.YearData !== "Listofholidays") {
            var selectedYear = oYearModel.getProperty("/selectedYear");
            this.byId("LOH_id_Holidays").setValue(selectedYear);
          } else {
            var selectedYear = oYearModel.setProperty( "/selectedYear", new Date().getFullYear());
            this.byId("LOH_id_Holidays").setValue(new Date().getFullYear());
          }
          this.HolidayReadCall();
        },
        HolidayReadCall: function () {
          sap.ui.core.BusyIndicator.show(0);
          var that = this;
          try {
            $.ajax({
              url: "https://www.rest.kalpavrikshatechnologies.com/ListOfHolidays",
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              success: function (data) {
                sap.ui.core.BusyIndicator.hide();
                var oModel = new JSONModel({ items: data.results });
                that.getView().setModel(oModel, "HolidayModel");
              },           
              error: function (err) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(err.responseJSON.message);
              }.bind(this),
            });
          }catch(error) {
            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageToast.show("Technical error please connect to administrator");
          }
        },
        LOH_onSignout: function () {
          this.getRouter().navTo("RouteLoginPage");
        },
        LOH_onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },
      }
    );
  }
);
