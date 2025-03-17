sap.ui.define(
  [
    "./BaseController", //call base controller
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
  ],
  function ( BaseController, JSONModel, MessageToast, Filter, FilterOperator, MessagePopover, MessageItem
 ) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.Listofholidays",
      {
        onInit: function () {
          var oYearModel = new sap.ui.model.json.JSONModel({
            selectedYear: new Date().getFullYear(),
          });
          this.getView().setModel(oYearModel, "yearModel");
          this.getRouter()
            .getRoute("RouteListofholidays")
            .attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function (oEvent) {
          this.YearData = oEvent.getParameter("arguments").Year;
          var oYearModel = this.getView().getModel("yearModel");
          if (this.YearData !== "Listofholidays") {
            var selectedYear = oYearModel.getProperty("/selectedYear");
            this.byId("LOH_id_Holidays").setValue(selectedYear);
          } else {
            var selectedYear = oYearModel.setProperty(
              "/selectedYear",
              new Date().getFullYear()
            );
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
                if (data && Array.isArray(data)) {
                  var oModel = new sap.ui.model.json.JSONModel(data);
                  that.getView().setModel(oModel, "HolidayModel");
                }
              },
              error: function (error) {
                sap.ui.core.BusyIndicator.hide();
                sap.m.MessageToast.show(
                  that.i18nModel.getText("commanMessage")
                );
                console.error("API Error: ", error);
              },
            });
          } catch (error) {
            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageToast.show(
              this.i18nModel.getText("commonErrorMessage")
            );
            console.error("Exception: ", error);
          }
        },
        onSearch: function () {
          this.YearData = "onSearchFilter";
          this.HolidayReadCall();
        },
        handleChange: function (oEvent) {
          var oYearModel = this.getView().getModel("yearModel");
          var newYear = this.byId("LOH_id_Holidays").getValue();
          if (newYear && !isNaN(newYear)) {
            oYearModel.setProperty("/selectedYear", newYear);
            this.HolidayReadCall();
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
