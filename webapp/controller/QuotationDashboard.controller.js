sap.ui.define([
    "./BaseController",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "../model/formatter"
],  (Controller, BusyIndicator, JSONModel, Formatter) => {
    "use strict";

    return Controller.extend("sap.kt.com.minihrsolution.controller.QuotationDashboard", {
      Formatter: Formatter,
      onInit() {
        this.getRouter().getRoute("RouteQuotationDashboard").attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function () {
        this.checkLoginModel();
        var FirstModel = new JSONModel({ type: "column", type1: "line" });
        this.getView().setModel(FirstModel, "FirstChart");
        this.FirstModel = this.getView().getModel("FirstChart");
        this.loginModel = this.getView().getModel("LoginModel");
        var oDateRange = this.byId("idDateRangeDashboard");
        var sDateRangeValue = oDateRange.getValue();
        var oToday = new Date();
        var oPastDate = new Date();
        oPastDate.setMonth(oPastDate.getMonth() - 3);
        var sFormattedStartDate = oPastDate.toISOString().split("T")[0];
        var sFormattedEndDate = oToday.toISOString().split("T")[0];
        sDateRangeValue = sFormattedStartDate + " to " + sFormattedEndDate;
        oDateRange.setValue(sDateRangeValue);
        this.getView().byId("idQuoIssuedByFirst").setValue(this.loginModel.getProperty("/EmployeeName"));
        this.getView().byId("idSecondQuoIssuedBy").setValue(this.loginModel.getProperty("/EmployeeName"));
        this.onSearch();
        this.onChangeCurrentMonthIssuedByFirst();
        this.onChangeCurrentMonthIssuedBy();
      },

      onNavBack: function () {
        BusyIndicator.show(0);
        this.getRouter().navTo("RouteQuotation");
      },

      onSearch: function () {
        var aFilterItems = this.byId("idDashboardfilterbar").getFilterGroupItems();
        var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" })
        var params = {};
        aFilterItems.forEach(function (oItem) {
          var oControl = oItem.getControl();
          var sValue = oItem.getName();
          if (oControl && oControl.getValue()) {
            if (sValue === "QuotationDate") {
              params["QuotationStartDate"] = oDateFormat.format(new Date(oControl.getValue().split(' to ')[0]));
              params["QuotationEndDate"] = oDateFormat.format(new Date(oControl.getValue().split(' to ')[1]));
            } else {
              params[sValue] = oControl.getValue();
            }
          }
        });
        this.CommonReadCall("StatusPieChart", params, "DateRangePieChartModel", "idVizFrameAll", "idPieChartAll", "", "Quotation v/s Branch");
        this.CommonReadCall("BaseLocationChart", params, "DateRangeBarChartModel", "idVizFrame1", "idPopover1", "Status", "Quotation v/s Status");
      },

      CommonReadCall: async function (url, params, modelName, Id1, Id2, Text, Title) {
        var response = await this.ajaxCreateWithJQuery(url, params, [Id1, Id2]);
        if (response.success) {
          var oModel = new JSONModel({ items: response.results });
          this.getView().setModel(oModel, modelName);
          if (Id1 === "idVizFrame" || Id1 === "idVizFrame1") {
            var oVizFrame = this.getView().byId(Id1);
            oVizFrame.setVizProperties({
              legend: { title: { visible: true, text: Text } },
              title: { visible: true, text: Title },
              plotArea: {
                dataPointStyle: {
                  rules: [
                    {
                      dataContext: { Status: "New" },
                      properties: { color: "#168eff" },
                      displayName: "New",
                    },
                    {
                      dataContext: { Status: "Booked" },
                      properties: { color: "#11bd08" },
                      displayName: "Booked",
                    },
                    {
                      dataContext: { Status: "Cancelled" },
                      properties: { color: "#cf1322" },
                      displayName: "Cancelled",
                    },
                  ],
                },
              },
            });
            oVizFrame.setModel(oModel);
            var oPopOver = this.getView().byId(Id2);
            oPopOver.connect(oVizFrame.getVizUid());
          } else {
            var oVizFrame = this.getView().byId(Id1);
            oVizFrame.setVizProperties({
              legend: {
                title: {
                  visible: true,
                  text: "Count",
                },
              },
              title: {
                visible: true,
                text: Title,
              },
            });
            oVizFrame.setModel(oModel);
            var oPopOver = this.getView().byId(Id2);
            oPopOver.connect(oVizFrame.getVizUid());
          }
        } else {
          sap.m.MessageToast.show("Error fetching data: " + response.errorMessage);
        }
      },
      onPressPie: function () {
        this.FirstModel.setProperty("/type", "pie");
      },

      onPressColumn: function () {
        this.FirstModel.setProperty("/type", "column");
      },

      onPressLine: function () {
        this.FirstModel.setProperty("/type1", "line");
      },

      onPressDonut() {
        this.FirstModel.setProperty("/type1", "donut");
      },

      onhandleBackPress: function () {
        this.getRouter().navTo("RouteQuotation");
      },

      onChangeCurrentMonthIssuedByFirst: function () {
        this.CommonReadCall("MonthlyBarChart", { QuotationIssuedBy: this.getView().byId("idSecondQuoIssuedBy").getValue() }, "GetPieChartCurrentMonth", "idVizFrame", "idPopover", "Status", "Current Month Quotation v/s Employee");
      },

      onChangeCurrentMonthIssuedBy: function () {
        this.CommonReadCall("QuotationStats", { QuotationIssuedBy: this.getView().byId("idQuoIssuedByFirst").getValue() }, "GetBarChatCurrentMonth", "idVizFram", "idPopove", "Status", "Per Day Quotation v/s Employee");
      },
    });
  }
);