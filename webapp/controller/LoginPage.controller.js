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
  function (
    BaseController,
    JSONModel,
    MessageToast,
    Filter,
    FilterOperator,
    MessagePopover,
    MessageItem
  ) {
    "use strict";
    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.LoginPage",
      {
        onInit: function () {
          var model = new JSONModel({
            HeaderName: "",
            url: "https://www.rest.kalpavrikshatechnologies.com/",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u"
            },
          });
          this.getOwnerComponent().setModel(model, "LoginModel");
          this.getRouter()
            .getRoute("RouteLoginPage")
            .attachMatched(this._onRouteMatched, this);
        },
        onpresshome: function () {
          this.getRouter().navTo("RouteHomePage");
        },
        onLogin: function () {
          var userid = this.byId("idUserid").getValue();
          var username = this.byId("idUsername").getValue();

          if (userid === "1" && username === "1") {
            this.getRouter().navTo("RouteTilePage");
          } else {
            MessageToast.show("Invalid credentials.");
          }
        },
      }
    );
  }
);
