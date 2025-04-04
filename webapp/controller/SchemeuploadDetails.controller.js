sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "../utils/validation",
    "../model/formatter",
  ],
  (
    Controller,
    MessageToast,
    JSONModel,
    MessageBox,
    BusyIndicator,
    utils,
    Formatter
  ) => {
    "use strict";
    return Controller.extend(
      "sap.kt.com.minihrsolution.controller.SchemeuploadDetails",
      {
        Formatter: Formatter,
        onInit: function () {
          this.getRouter()
            .getRoute("RouteSchemeUploadDetails")
            .attachMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
          BusyIndicator.hide();
          var that = this;
          var sData = oEvent.getParameter("arguments").data;
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

          if (sData === "new") {
            // Create Mode: Open view with empty data
            var oModelData = {
              Model: "",
              Variant: "",
              Transmission: "",
              Color: "",
              Fuel: "",
              BoardPlate: "",
              Make: "",
              Emission: "",
              EXShowroom: "",
              ConsumerScheme: "",
              EXShowroomAfterScheme: "",
              TCS1Perc: "",
              ROADTAX: "",
              AddOnInsurance: "",
              RegHypCharge: "",
              ShieldOfTrust4YR45K: "",
              EXTDWarrantyFOR4YR80K: "",
              RSA: "",
              STDFittings: "",
              FastTag: "",
              VAS: "",
              DiscountOffers: "",
              isEditable: true,
              isCreateMode: true, // Make fields editable
            };
            var oModel = new JSONModel(oModelData);
            this.getView().setModel(oModel, "detailModel");
            this.getView().byId("SUD_id_Edit").setText("Save"); // Change button text to "Save"
          } else {
            // Edit Mode: Fetch data for the selected ID
            BusyIndicator.show(0);
            $.ajax({
              url: `https://www.rest.kalpavrikshatechnologies.com/SchemeUploade?ID=${sData}`,
              type: "GET",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              success: function (odata) {
                BusyIndicator.hide();
                if (odata && odata.data && odata.data.length > 0) {
                  var oModelData =
                    odata.data.find((item) => item.ID == sData) || {};
                  oModelData.isEditable = false;
                  var oModel = new JSONModel(oModelData);
                  that.getView().setModel(oModel, "detailModel");
                  that.getView().byId("SUD_id_Edit").setText("Edit"); // Set button text to "Edit"
                } else {
                  MessageToast.show("No data found.");
                }
              },
              errr: function () {
                BusyIndicator.hide();
                MessageToast.show("Error fetching data.");
              },
            });
          }
        },

        SUD_onhandleBackPress: function () {
          BusyIndicator.show(0);
          this.getRouter().navTo("RouteSchemeUpload");
        },
        SUD_onhandleEdit_SavePress: function () {
          var oView = this.getView();
          var oModel = oView.getModel("detailModel");
          var oData = oModel.getData();

          if (!oData.isEditable) {
            oModel.setProperty("/isEditable", true);
            oView.byId("SUD_id_Edit").setText(this.i18nModel.getText("save"));
            return;
          }

          if (oData.isCreateMode && !this.validateRequiredFields()) {
            return;
          }

          var bIsUpdate = !!oData.ID;
          var sType = bIsUpdate ? "PUT" : "POST";
          var sEndpoint =
            "https://www.rest.kalpavrikshatechnologies.com/SchemeUploade"; // Don't append ID to URL

          var oPayload = {
            variant: oData.Variant,
            model: oData.Model,
            fuel: oData.Fuel,
            transmission: oData.Transmission,
            color: oData.Color,
            boardPlate: oData.BoardPlate,
            exShowroom: oData.EXShowroom,
            consumerScheme: oData.ConsumerScheme,
            exShowroomAfterScheme: oData.EXShowroomAfterScheme,
            TCS1Perc: oData.TCS1Perc,
            roadTax: oData.ROADTAX,
            addOnInsurance: oData.AddOnInsurance,
            shieldOfTrust4YR45K: oData.ShieldOfTrust4YR45K,
            regHypCharge: oData.RegHypCharge,
            EXTDWarrantyFOR4YR80K: oData.EXTDWarrantyFOR4YR80K,
            STDFittings: oData.STDFittings,
            fastTag: oData.FastTag,
            VAS: oData.VAS,
            RSA: oData.RSA,
            discountOffers: oData.DiscountOffers,
            make: oData.Make,
            emission: oData.Emission,
          };

          var oRequestBody = bIsUpdate
            ? { data: oPayload, filters: { ID: oData.ID } }
            : { data: oPayload };

          BusyIndicator.show(0);

          $.ajax({
            url: sEndpoint,
            type: sType,
            headers: {
              "Content-Type": "application/json",
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            data: JSON.stringify(oRequestBody),
            success: function (response) {
              BusyIndicator.hide();
              MessageToast.show(
                bIsUpdate
                  ? "Scheme Updated Successfully"
                  : "Scheme Created Successfully"
              );

              if (response && response.ID) {
                oModel.setProperty("/ID", response.ID);
              }

              oModel.setProperty("/isEditable", false);
              oView.byId("SUD_id_Edit").setText("Edit");
            },
            error: function (jqXHR) {
              BusyIndicator.hide();
              var sError =
                jqXHR.responseJSON?.error || "Error: " + jqXHR.statusText;
              MessageToast.show(sError);
            },
          });
        },

        SUD_onFieldLiveChange: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        validateRequiredFields: function () {
          var that = this;
          var bValid = true;

          var aRequiredFields = [
            this.byId("SUD_id_Model"),
            this.byId("SUD_id_Variant"),
            this.byId("SUD_id_Transmission"),
            this.byId("SUD_id_Color"),
            this.byId("SUD_id_Fuel"),
          ];

          aRequiredFields.forEach(function (oField) {
            if (!utils._LCvalidateMandatoryField(oField, "ID")) {
              bValid = false;
            }
          });

          if (!bValid) {
            MessageToast.show(that.i18nModel.getText("mandetoryFields"));
            return false; // Stop saving
          }

          return true; // Proceed with saving
        },
        //formate
        SUD_onFieldChange: function (oEvent) {
          var oSchemeSource = oEvent.getSource();
          var schemeValue = oSchemeSource.getValue().trim();
          var schemerawValue = schemeValue.replace(/,/g, "");

          // Check if rawValue is a valid number
          if (!/^-?\d+(\.\d+)?$/.test(schemerawValue)) {
            schemerawValue = 0; // Reset invalid inputs to "0"
          } else {
            schemerawValue = parseFloat(schemerawValue);
          }

          // Ensure schemerawValue is not NaN
          if (isNaN(schemerawValue)) {
            schemerawValue = 0;
          }
          var formattedValue = schemerawValue.toFixed(2);
          var schemeBindingPath = oSchemeSource.getBinding("value").getPath();
          var oModel = this.getView().getModel("detailModel");

          // Update the model with the validated numeric value
          oModel.setProperty(schemeBindingPath, formattedValue);
          oModel.refresh(true);
        },
      }
    );
  }
);
