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
        },
        _RouteAppVisibility: function () {
          this.getView().setModel(new JSONModel({ isFileValid: false })); //for createfragmentsubmit button
          this.MainModel = new sap.ui.model.json.JSONModel({ items: [] }); // Store table data
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
        SU_onUploadpress: function () {
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

          // Validate file type
          // var validTypes = ["xlsx"];
          // var fileType = file.name.split(".").pop().toLowerCase();

          // if (!validTypes.includes(fileType)) {
          //   MessageToast.show(
          //     "Invalid file type! Please upload an Excel (.xlsx) file."
          //   );
          //   return;
          // }
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

              // **Update MainModel to reflect the data in the UI**
              that.MainModel.setProperty("/items", excelData);
              that.MainModel.refresh(true); // Ensure UI updates
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
          var that = this;
          var oFileUploader = sap.ui.getCore().byId("idFileUploader");

          if (
            !that._uploadedExcelData ||
            that._uploadedExcelData.length === 0
          ) {
            MessageToast.show("No Data In Excel");
            return;
          }

          sap.ui.core.BusyIndicator.show(0);

          try {
            // Format Data
            var formattedData = that._uploadedExcelData.map((row) => ({
              Company: row["Company"] || "",
              Variant: row["Variant"] || "",
              Model: row["Model"] || "",
              Transmission: row["Transmission"] || "",
              Color: row["Color"] || "",
              Fuel: row["Fuel"] || "",
              BoardPlate: row["BoardPlate"] || "",
              EXShowroom: row["Ex-showroom"] || "",
              ConsumerScheme: row["Consumer Scheme"] || "",
              EXShowroomAfterScheme: row["Ex-Showroom  after Scheme"] || "",
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

            // Update MainModel with formattedData
            that.MainModel.setData({ items: formattedData }); // Instead of setProperty
            that.getView().setModel(that.MainModel, "MainModel"); // Ensure model is set to the view
            that.MainModel.refresh(true); // Refresh model to update UI

            MessageToast.show("Scheme Upload Success");
          } catch (error) {
            MessageToast.show("Error uploading data. Please try again.");
            console.error("Upload Error:", error);
          } finally {
            sap.ui.core.BusyIndicator.hide();
            oFileUploader.setValue(""); // Reset file uploader
            that._uploadedExcelData = null;
            if (that.oDialog) that.oDialog.close();
          }
        },
      }
    );
  }
);
