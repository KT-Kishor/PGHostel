sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
  ],
  (Controller, MessageToast, JSONModel, MessageBox, BusyIndicator) => {
    "use strict";
    return Controller.extend(
      "sap.kt.com.minihrsolution.controller.SchemeuploadDetails",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteSchemeUploadDetails")
            .attachMatched(this._RouteAppVisibility, this);
        },
        _RouteAppVisibility: function () {},
      }
    );
  }
);
