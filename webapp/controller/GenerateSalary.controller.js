sap.ui.define(
  ["./BaseController", "sap/m/MessageToast", "sap/ui/core/BusyIndicator",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"],
  (Controller, MessageToast, BusyIndicator, MessagePopover, MessageItem) => {
    "use strict";

    return Controller.extend("sap.kt.com.minihrsolution.controller.GenerateSalary", {
      onInit: function () {
        var i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        this.oMessagePopover = new MessagePopover({
          items: [
            new MessageItem({
              type: "Information",
              title: "P - Present",
              description: i18n.getText("forP")
            }),
            new MessageItem({
              type: "Information",
              title: "A - Absent",
              description: i18n.getText("forA")
            }),
            new MessageItem({
              type: "Information",
              title: "H - Half-Day",
              description: i18n.getText("forH")
            }),
            new MessageItem({
              type: "Information",
              title: "LA - Late",
              description: i18n.getText("forLA")
            }),
            new MessageItem({
              type: "Information",
              title: "L - Leave",
              description: i18n.getText("forL")
            }),
            new MessageItem({
              type: "Information",
              title: "SP - Present on Sunday",
              description: i18n.getText("forSP")
            }),
            new MessageItem({
              type: "Information",
              title: "SA - Absent on Sunday",
              description: i18n.getText("forSA")
            }),
            new MessageItem({
              type: "Information",
              title: "SH - Half-Day on Sunday",
              description: i18n.getText("forSH")
            }),
            new MessageItem({
              type: "Information",
              title: "SLA - Late on Sunday",
              description: i18n.getText("forSLA")
            }),
            new MessageItem({
              type: "Information",
              title: "SL - Leave on Sunday",
              description: i18n.getText("forSL")
            })
          ]
        });
        this.getView().addDependent(this.oMessagePopover);

        this.getRouter().getRoute("RouteGenerateSalary").attachMatched(this._onRouteMatched, this);
      },

      GS_onOpenMessagePopover: function (oEvent) {
        this.oMessagePopover.openBy(oEvent.getSource());
      },

      _onRouteMatched: function () {
        this.getView().getModel("LoginModel").setProperty("/HeaderName", "Hii"); 
        var oModel = this.getView().getModel("Payroll");
        oModel.setProperty("/ShowOnGenerate",true);
        oModel.setProperty("/ShowOnPayroll",false);

      
      },

      GS_onPressback: function () {
        this.getOwnerComponent().getRouter().navTo("RouteTilePage");
      },

      GS_onLogout: function () {
        this.getOwnerComponent().getRouter().navTo("RouteLoginPage");
      }
    });
  }
);
