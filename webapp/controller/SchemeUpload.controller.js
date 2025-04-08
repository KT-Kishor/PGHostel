sap.ui.define(
  [
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/export/Spreadsheet",
  ],
  (
    Controller,
    MessageToast,
    JSONModel,
    MessageBox,
    BusyIndicator,
    Spreadsheet
  ) => {
    "use strict";
    return Controller.extend(
      "sap.kt.com.minihrsolution.controller.SchemeUpload",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteSchemeUpload")
            .attachMatched(this._RouteAppVisibility, this);
        },
        _RouteAppVisibility: function (oEvent) {
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView().setModel(new JSONModel({ isFileValid: false })); //for createfragmentsubmit button
          this.getView()
            .getModel("LoginModel")
            .setProperty("/HeaderName", this.i18nModel.getText("schemeupload"));
          this.MainModel = new JSONModel({ items: [] }); // Store table data
          this.oValue = oEvent.getParameter("arguments").value;
          if (this.oValue === "SchemeUpload") {
            this.CommomReadCall("");
            this.SU_onClear();
          } else {
            this.SU_onSearch();
          }
        },
        //for Search
        SU_onSearch: function () {
          var aFilterItems = this.byId("SU_id_Filterbar").getFilterGroupItems();
          var params = {};
          aFilterItems.forEach(function (oItem) {
            var oControl = oItem.getControl(); // Get the associated control
            var sValue = oItem.getName();
            if (oControl && oControl.getValue()) {
              params[sValue] = oControl.getValue();
            }
          });
          this._fetchCommonData("SchemeUploade", "ModelOnly", params);
          this.CommomReadCall(params);
        },

        SU_onClear: function () {
          var oFilterBar = this.getView().byId("SU_id_Filterbar");
          oFilterBar.getFilterGroupItems().forEach(function (oItem) {
            var oControl = oItem.getControl();
            if (oControl.setSelectedKey) {
              oControl.setSelectedKey("");
            } else if (oControl.setValue) {
              oControl.setValue("");
            }
          });
        },
        SU_onModelChange: function (oEvent) {
          var oVariantComboBox = this.getView().byId("SU_id_Variant1");
          var oTransmissionComboBox = this.getView().byId(
            "SU_id_Transmission1"
          );

          if (oVariantComboBox) {
            oVariantComboBox.setSelectedKey(""); // Clear selection
            oVariantComboBox.setValue(""); // Clear displayed text
          }
          if (oTransmissionComboBox) {
            oTransmissionComboBox.setSelectedKey(""); // Clear selection
            oTransmissionComboBox.setValue(""); // Clear displayed text
          }
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

        FUS_onCreateDialogCancel: function () {
          this.oDialog.close();
          var oFileUploader = sap.ui.getCore().byId("idFileUploader");
          oFileUploader.setValue("");
        },
        FUS_onUpload: function (e) {
          var file = e.getParameter("files") && e.getParameter("files")[0];
          var oModel = this.getView().getModel();
          if (file) {
            oModel.setProperty("/isFileValid", true);
            this._import(file);
          }

          // Validate file type
          var validTypes = ["xlsx"];
          var fileType = file.name.split(".").pop().toLowerCase();

          if (!validTypes.includes(fileType)) {
            MessageToast.show(
              "Invalid file type! Please upload an Excel (.xlsx) file."
            );
            return;
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
        //export
        SU_onDownloadpress: function () {
          const oTable = this.byId("SU_id_Quotationtable");
          if (!oTable) {
            MessageToast.show("Table not found");
            return;
          }

          const oModel = oTable.getModel("MainModel");
          if (!oModel) {
            MessageToast.show("Model not found");
            return;
          }

          const oData = oModel.getData();
          const aResults = oData.results;

          if (!Array.isArray(aResults) || aResults.length === 0) {
            MessageToast.show(this.i18nModel.getText("noData"));
            return;
          }

          const aCols = this.createColumnConfig();
          const oSettings = {
            workbook: { columns: aCols, hierarchyLevel: "Level" },
            dataSource: aResults,
            fileName: "QuotationScheme.xlsx",
            worker: false,
          };

          const oSheet = new Spreadsheet(oSettings);
          oSheet.build().finally(() => {
            oSheet.destroy();
          });
        },
        createColumnConfig: function () {
          return [
            { label: "Model", property: "Model", type: "string" },
            { label: "Variant", property: "Variant", type: "string" },
            { label: "Transmission", property: "Transmission", type: "string" },
            { label: "Color", property: "Color", type: "string" },
            { label: "Fuel", property: "Fuel", type: "string" },
            { label: "BoardPlate", property: "BoardPlate", type: "string" },
            { label: "Ex-showroom", property: "EXShowroom", type: "number" },
            {
              label: "Consumer Scheme",
              property: "ConsumerScheme",
              type: "number",
            },
            {
              label: "Ex-Showroom  after Scheme",
              property: "EXShowroomAfterScheme",
              type: "number",
            },
            { label: "TCS  1%", property: "TCS1Perc", type: "number" },
            { label: "ROAD TAX", property: "ROADTAX", type: "number" },
            {
              label: "Regular Insurance",
              property: "Regular Insurance",
              type: "number",
            },
            {
              label: "Add On Insurance",
              property: "AddOnInsurance",
              type: "number",
            },
            { label: "Temp Charges", property: "Temp Charges", type: "number" },
            { label: "RegHypCHARGE", property: "RegHypCharge", type: "number" },
            {
              label: "Shield of trust 4YR45K",
              property: "ShieldOfTrust4YR45K",
              type: "number",
            },
            {
              label: "EXTD Warranty FOR 4YR80K",
              property: "EXTDWarrantyFOR4YR80K",
              type: "number",
            },
            { label: "RSA", property: "RSA", type: "number" },
            { label: "STD Fittings", property: "STDFittings", type: "number" },
            { label: "FAST TAG", property: "FastTag", type: "number" },
            { label: "VAS", property: "VAS", type: "number" },
            {
              label: "Discountoffers",
              property: "DiscountOffers",
              type: "number",
            },
            { label: "Make", property: "Make", type: "string" },
            { label: "Emission", property: "Emission", type: "string" },
          ];
        },
        SU_onDeletepress: function () {
          var oTable = this.byId("SU_id_Quotationtable");
          var oSelectedItem = oTable.getSelectedItem();
          if (!oSelectedItem) {
            MessageBox.error(this.i18nModel.getText("msgSelectRow"));
            return;
          }
          var sID = oSelectedItem
            .getBindingContext("MainModel")
            .getProperty("ID");
          var that = this;
          var oDialog = new sap.m.Dialog({
            title: this.i18nModel.getText("msgBoxConfirm"),
            type: sap.m.DialogType.Message,
            icon: "sap-icon://warning",
            state: sap.ui.core.ValueState.Warning,
            content: new sap.m.Text({
              text: this.i18nModel.getText("msgBoxConfirmDelete"),
            }),
            beginButton: new sap.m.Button({
              text: this.i18nModel.getText("OkButton"),
              type: sap.m.ButtonType.Accept,
              press: function () {
                oDialog.close();
                BusyIndicator.show();
                that
                  .ajaxDeleteWithJQuery(
                    "/SchemeUploade",
                    { filters: { ID: sID } },
                    {}
                  )
                  .then(() => {
                    oTable.removeSelections();
                    that.SU_onSearch();
                    MessageToast.show(
                      that.i18nModel.getText("msgSchemeDeleted")
                    );
                  })
                  .catch((error) => {
                    BusyIndicator.hide();
                    var errorMessage =
                      error.responseJSON?.error ||
                      that.i18nModel.getText("quoschemeerrordeelterow");
                    MessageToast.show(errorMessage);
                  });
              },
            }),
            endButton: new sap.m.Button({
              text: this.i18nModel.getText("CancelButton"),
              type: sap.m.ButtonType.Reject,
              press: function () {
                that.byId("SU_id_Quotationtable").removeSelections(true);
                oDialog.close();
              },
            }),
            afterClose: function () {
              oDialog.destroy();
            },
          });
          oDialog.open();
        },

        FUS_onCreateDialogSubmit: async function () {
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
          // Format Data
          var formattedData = that._uploadedExcelData.map((row) => ({
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

          // Send data to backend
          var response = await that.ajaxCreateWithJQuery("SchemeUploade", {
            data: formattedData,
          });
          if (response.success) {
            sap.ui.core.BusyIndicator.hide();
            MessageToast.show("Scheme saved successfully!");

            // Update UI Model after successful save
            that.getView().setModel(that.MainModel, "MainModel");
            that.MainModel.refresh(true);
            that.CommomReadCall("");
            oFileUploader.setValue(""); // Reset file uploader
            that.SU_onClear();
            that.oDialog.close();
          } else {
            sap.ui.core.BusyIndicator.hide();
            oFileUploader.setValue(""); // Reset file uploader
            that._uploadedExcelData = null;
            if (that.oDialog) that.oDialog.close();
            MessageToast.show("Failed to save data. Please try again.");
          }
        },
        CommomReadCall: function (filter) {
          this.ajaxReadWithJQuery("SchemeUploade", filter)
            .then((oData) => {
              var offerData = Array.isArray(oData.data)
                ? oData.data
                : [oData.data];
              // Set full result to MainModel
              this.getView().setModel(
                new JSONModel({ results: offerData }),
                "MainModel"
              );
              // Deduplicate for each ComboBox
              const getUnique = (arr, key) => {
                const seen = new Set();
                return arr
                  .filter((item) => {
                    if (item[key] && !seen.has(item[key])) {
                      seen.add(item[key]);
                      return true;
                    }
                    return false;
                  })
                  .map((item) => ({ [key]: item[key] }));
              };

              const uniqueModels = getUnique(offerData, "Model");
              const uniqueVariants = getUnique(offerData, "Variant");
              const uniqueTransmissions = getUnique(offerData, "Transmission");
              this.getView().setModel(
                new JSONModel({ results: uniqueModels }),
                "ModelOnly"
              );
              this.getView().setModel(
                new JSONModel({ results: uniqueVariants }),
                "VariantOnly"
              );
              this.getView().setModel(
                new JSONModel({ results: uniqueTransmissions }),
                "TransmissionOnly"
              );

              sap.ui.core.BusyIndicator.hide();
            })
            .catch((oError) => {
              sap.ui.core.BusyIndicator.hide();
              MessageBox.error(
                this.i18nModel.getText("commonReadingDataError")
              );
            });
        },

        //Navigate to new page with data
        SU_onItemPress: function (oEvent) {
          var oSelectedContext = oEvent
            .getSource()
            .getBindingContext("MainModel");
          if (!oSelectedContext) {
            return;
          }

          var oData = oSelectedContext.getObject();
          if (!oData) {
            return;
          }
          oData.isEditable = false;
          BusyIndicator.show(0);
          this.getRouter().navTo("RouteSchemeUploadDetails", {
            data: oData.ID,
          });
        },
        //create a new data
        SU_onCreateform: function () {
          BusyIndicator.show(0);
          this.getRouter().navTo("RouteSchemeUploadDetails", { data: "new" });
        },
      }
    );
  }
);
