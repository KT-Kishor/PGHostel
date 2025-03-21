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
      "sap.kt.com.minihrsolution.controller.SchemeUpload",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteSchemeUpload")
            .attachMatched(this._RouteAppVisibility, this);
          this.oEditModel = new JSONModel({
            isModelEditable: false,
            isVariantEditable: false,
            isTransmissionEditable: false,
          });
          this.getView().setModel(this.oEditModel, "editableModel");
        },
        _RouteAppVisibility: function () {
          this.getView().setModel(new JSONModel({ isFileValid: false })); //for createfragmentsubmit button
          this.MainModel = new JSONModel({
            items: [], // Store table data
          });
          this.getOwnerComponent().setModel(this.MainModel, "MainModel");
        },
        // goto Tilepage
        onPressback: function () {
          this.getRouter().navTo("RouteTilePage");
        },
        //for Singout
        onLogout: function () {
          this.getRouter().navTo("RouteLoginPage");
        },
        //open uploadBox
        onUploadpress: function () {
          if (!this.oDialog) {
            this.oDialog = sap.ui.xmlfragment(
              "sap.kt.com.minihrsolution.fragment.Uploadscheme",
              this
            );
            this.getView().addDependent(this.oDialog);
          }

          this.oDialog.open();
        },

        onCreateDialogCancel: function () {
          this.oDialog.close();
        },
        onUpload: function (e) {
          var file = e.getParameter("files") && e.getParameter("files")[0];
          var oModel = this.getView().getModel();
          if (file) {
            oModel.setProperty("/isFileValid", true);
            this._import(file);
          }
        },
        _import: function (file) {
          var that = this;
          var excelData = [];

          if (file && window.FileReader) {
            var reader = new FileReader();
            reader.onload = function (e) {
              var data = e.target.result;
              var workbook = XLSX.read(data, { type: "binary" });

              workbook.SheetNames.forEach(function (sheetName) {
                excelData = XLSX.utils.sheet_to_row_object_array(
                  workbook.Sheets[sheetName]
                );
              });

              that._uploadedExcelData = excelData;
            };

            reader.onerror = function (ex) {
              MessageToast.show(
                that.i18nModel.getText("quoSchemereadingfileerror"),
                ex
              );
            };

            reader.readAsBinaryString(file);
          }
        },
        onCreateDialogSubmit: async function () {
          try {
            var that = this;
            var oFileUploader = sap.ui.getCore().byId("idFileUploader");

            // Validate Data

            if (
              !that._uploadedExcelData ||
              that._uploadedExcelData.length === 0
            ) {
              MessageToast.show(that.i18nModel.getText("msgNoDataInExcel"));
              return;
            }

            sap.ui.core.BusyIndicator.show(0);

            try {
              // Step 1: Delete Existing Data
              await that.deleteData(selectedBrand);

              // Step 2: Format Data
              var formattedData = that._uploadedExcelData.map((row) => ({
                Company: row["Company"] || "",
                Variant: row["Variant"] || "",
                Model: row["Model"] || "",
                Transmission: row["Transmission"] || "",
                Color: row["Color"] || "",
                Fuel: row["Fuel"] || "",
                BoardPlate: row["BoardPlate"] || "",
                ExShowroom: row["Ex-showroom"] || "",
                ConsumerScheme: row["Consumer Scheme"] || "",
                ExShowroomAfterScheme: row["Ex-Showroom  after Scheme"] || "",
                TCS1Perc: row["TCS  1%"] || "",
                ROADTAX: row["ROAD TAX"] || "",
                AddOnInsurance: row["Add On Insurance"] || "",
                RegHypCharge: row["RegHypCHARGE"] || "",
                ShieldOfTrust4YR45K: row["Shield of trust 4YR45K"] || "",
                EXTDWarrantyFOR4YR80K: row["EXTD Warranty FOR 4YR80K"] || "",
                STDFittings: row["STD Fittings"] || "",
                FastTag: row["FAST TAG"] || "",
                VAS: row["VAS"] || "",
                RSA: row["RSA"] || "",
                DiscountOffers: row["Discountoffers"] || "",
                Make: row["Make"] || "",
                Emission: row["Emission"] || "",
              }));

              // Step 3: Upload Data in Batches
              await that.uploadData(formattedData);

              if (formattedData.length === this.totalUploadedRecords) {
                MessageToast.show(
                  that.i18nModel.getText("msgSchemeUploadSuccess")
                );
              } else {
                MessageToast.show(
                  `${formattedData.length}/${this.totalUploadedRecords}` +
                    this.i18nModel.getText("msgUploadLengthError")
                );
              }

              that._fetchInitialData();
              oFileUploader.clear();
              that._uploadedExcelData = null;
              if (that.oDialog) that.oDialog.close();
              that.onClear();
            } catch (error) {
              MessageToast.show(
                that.i18nModel.getText("msgSchemeUploadFailed")
              );
            } finally {
              sap.ui.core.BusyIndicator.hide();
            }
          } catch (error) {
            MessageBox.error(that.i18nModel.getText("msgBoxSubmitCatch"), {
              // Show MessageBox if no company code is selected
              title: that.i18nModel.getText("msguploadError"),
            });
          }
        },
      }
    );
  }
);
