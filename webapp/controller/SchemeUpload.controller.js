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
            .getRoute("RouteManageSchemeupload")
            .attachMatched(this._RouteAppVisibility, this);
          this.oEditModel = new JSONModel({
            isModelEditable: false,
            isVariantEditable: false,
            isTransmissionEditable: false,
          });
          this.getView().setModel(this.oEditModel, "editableModel");
        },
        _RouteAppVisibility: function () {
          BusyIndicator.hide();
          this.getView().setModel(new JSONModel({ isFileValid: false })); //for createfragmentsubmit button

          this.onRefreshApplication("QuotationScheme");
          this.API = "https://rest.shahportal.in";
          this.loginModel = this.getView().getModel("UserDetails");
          this.MainModel = new JSONModel({
            items: [], // Store table data
          });
          this.getOwnerComponent().setModel(this.MainModel, "MainModel");
          this.onSearch();
          this.CommonCompanyDetails();
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle(); // Get i18n model
          this._makeDatePickersReadOnly([
            "idCompanyCode",
            "idCompanyCodeComboBox",
            "idModelComboBox",
            "idVariant1",
            "idTransmission1",
          ]);
        },
        onPressback: function () {
          BusyIndicator.show(0);
          this.getRouter().navTo("RouteAppVisibility");
        },
        onSignout: function () {
          this.navigateLoginPage();
        },
        onUpload: function (e) {
          var file = e.getParameter("files") && e.getParameter("files")[0];
          var oModel = this.getView().getModel();
          if (file) {
            oModel.setProperty("/isFileValid", true);
            this._import(file);
          }
        },
        onTypeMissmatch: function () {
          MessageToast.show(this.i18nModel.getText("msgInvalidFile"));
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

        // for Filter
        onCompanyChange: function (oEvent) {
          try {
            var that = this;
            var selectedCompanyCode = oEvent.getSource().getSelectedKey(); // selected company code
            // if (!selectedCompanyCode) {
            //   MessageToast.show(that.i18nModel.getText("msgInvalidFile"));
            //   return;
            // }

            var sUrl =
              this.API +
              "/CompanyNameFunction?Company=" +
              encodeURIComponent(selectedCompanyCode.trim());
            BusyIndicator.show(0);
            $.ajax({
              url: sUrl,
              type: "GET",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
                password:
                  "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
              },
              success: function (data) {
                BusyIndicator.hide();
                var oModel = new JSONModel(data);
                oModel.setProperty("/CompanyCode", selectedCompanyCode); // Store selected company code
                this.getView().setModel(oModel, "ModelFilter");
                var oCompanyComboBox = this.byId("idCompanyCode");
                oCompanyComboBox.setValueState("None");
                // Reset the Model ComboBox value to blank
                var oModelComboBox = this.getView().byId("idModelComboBox");
                if (oModelComboBox) {
                  oModelComboBox.setSelectedKey(""); // Clear selection
                  oModelComboBox.setValue(""); // Clear displayed text
                }

                // Clear Variant and Transmission selections as well
                var oVariantComboBox = this.getView().byId("idVariant1");
                var oTransmissionComboBox =
                  this.getView().byId("idTransmission1");
                if (oVariantComboBox) oVariantComboBox.setSelectedKey("");
                if (oTransmissionComboBox)
                  oTransmissionComboBox.setSelectedKey("");

                var oModelData = this.getView().byId("idModelComboBox");
                oModelData.bindAggregation("items", {
                  path: "ModelFilter>/results",
                  template: new sap.ui.core.Item({
                    key: "{ModelFilter>Model}",
                    text: "{ModelFilter>Model}",
                  }),
                });
                // Enable Model field when Company is selected
                this.oEditModel.setProperty("/isModelEditable", true);
                this.oEditModel.setProperty("/isVariantEditable", false);
                this.oEditModel.setProperty("/isTransmissionEditable", false);
              }.bind(this),
              error: function (error) {
                BusyIndicator.hide();
                MessageToast.show(
                  that.i18nModel.getText("quoSchemefailedtofetch")
                );
              },
            });
          } catch (error) {
            MessageToast.show(that.i18nModel.getText("msgTechnicalError"));
          }
        },
        onModelChange: function () {
          try {
            var that = this;
            // Reset Variant and Transmission selections
            var oVariantComboBox = this.getView().byId("idVariant1");
            var oTransmissionComboBox = this.getView().byId("idTransmission1");

            if (oVariantComboBox) {
              oVariantComboBox.setSelectedKey(""); // Clear selection
              oVariantComboBox.setValue(""); // Clear displayed text
            }
            if (oTransmissionComboBox) {
              oTransmissionComboBox.setSelectedKey(""); // Clear selection
              oTransmissionComboBox.setValue(""); // Clear displayed text
            }
            $.ajax({
              url:
                this.API +
                "/QuotationScheme?CompanyName=" +
                this.byId("idCompanyCode").getSelectedKey() +
                "&Model=" +
                this.byId("idModelComboBox").getValue(),
              type: "GET",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
                password:
                  "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
              },
              success: function (data) {
                if (data && data.results && Array.isArray(data.results)) {
                  // Extract unique Variants and Transmissions
                  var uniqueVariants = [
                    ...new Set(data.results.map((item) => item.Variant)),
                  ].map((variant) => ({ Variant: variant })); // Convert to object format

                  var uniqueTransmissions = [
                    ...new Set(data.results.map((item) => item.Transmission)),
                  ].map((transmission) => ({ Transmission: transmission })); // Convert to object format

                  // Set the models with properly structured data
                  var oFilterModel = new JSONModel({
                    VariantResults: uniqueVariants,
                    TransmissionResults: uniqueTransmissions,
                  });
                  that.getView().setModel(oFilterModel, "ModelVarient");

                  // Bind ComboBox items for Variant
                  var oVariant = that.getView().byId("idVariant1");
                  oVariant.bindItems({
                    path: "ModelVarient>/VariantResults",
                    template: new sap.ui.core.Item({
                      key: "{ModelVarient>Variant}",
                      text: "{ModelVarient>Variant}",
                    }),
                  });

                  // Bind ComboBox items for Transmission
                  var oTransmission = that.getView().byId("idTransmission1");
                  oTransmission.bindItems({
                    path: "ModelVarient>/TransmissionResults",
                    template: new sap.ui.core.Item({
                      key: "{ModelVarient>Transmission}",
                      text: "{ModelVarient>Transmission}",
                    }),
                  });
                }

                // Enable the Variant and Transmission fields
                that.oEditModel.setProperty("/isVariantEditable", true);
                that.oEditModel.setProperty("/isTransmissionEditable", true);
              },
              error: function () {
                BusyIndicator.hide();
                MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
              },
            });
          } catch (error) {
            MessageToast.show(that.i18nModel.getText("msgTechnicalError"));
          }
        },
        onDownloadpress: function () {
          var that = this;
          var oModel = this.getView().getModel("MainModel"); // Get the data model
          var aData = oModel.getProperty("/items");
          var oCompanyComboBox = this.byId("idCompanyCode");
          var selectedCompanyCode = oCompanyComboBox.getSelectedKey(); // Get selected key instead of value

          // Check if Company field is empty
          if (!selectedCompanyCode) {
            oCompanyComboBox.setValueState("Error");
            oCompanyComboBox.setValueStateText(
              that.i18nModel.getText("msaBOxselectcompany")
            );
            MessageBox.error(that.i18nModel.getText("msaBOxselectcompany"), {
              title: that.i18nModel.getText("msgBoximp"),
            });
            return;
          } else {
            // Reset ValueState when valid input is provided
            oCompanyComboBox.setValueState("None");
          }
          //for only header parts
          if (aData.length === 0) {
            MessageToast.show(that.i18nModel.getText("msgNoDataDownload"));
            var columnHeaders = [
              {
                Company: "",
                Model: "",
                Variant: "",
                Transmission: "",
                Color: "",
                Fuel: "",
                BoardPlate: "",
                "Ex-showroom": "",
                "TCS  1%": "",
                "Consumer Scheme": "",
                "Ex-Showroom  after Scheme": "",
                "ROAD TAX": "",
                "Add On Insurance": "",
                RegHypCHARGE: "",
                "Shield of trust 4YR45K": "",
                "EXTD Warranty FOR 4YR80K": "",
                "STD Fittings": "",
                "FAST TAG": "",
                VAS: "",
                RSA: "",
                Discountoffers: "",
                Make: "",
                Emission: "",
              },
            ];
            var ws = XLSX.utils.json_to_sheet(columnHeaders, {
              skipHeader: false,
            });
          } else {
            // Remove 'ID' field before exporting
            for (let i = 0; i < aData.length; i++) {
              delete aData[i].ID;
            }

            // Convert JSON data to an Excel sheet
            var ws = XLSX.utils.json_to_sheet(aData);

            // Rename column headers
            var range = XLSX.utils.decode_range(ws["!ref"]);
            for (let C = range.s.c; C <= range.e.c; ++C) {
              var cellRef = XLSX.utils.encode_col(C) + "1";
              if (ws[cellRef]) {
                switch (ws[cellRef].v) {
                  case "TCS1Perc":
                    ws[cellRef].v = "TCS  1%";
                    break;
                  case "ExShowroom":
                    ws[cellRef].v = "Ex-showroom";
                    break;
                  case "ConsumerScheme":
                    ws[cellRef].v = "Consumer Scheme";
                    break;
                  case "ExShowroomAfterScheme":
                    ws[cellRef].v = "Ex-Showroom  after Scheme";
                    break;
                  case "ROADTAX":
                    ws[cellRef].v = "ROAD TAX";
                    break;
                  case "AddOnInsurance":
                    ws[cellRef].v = "Add On Insurance";
                    break;
                  case "RegHypCharge":
                    ws[cellRef].v = "RegHypCHARGE";
                    break;
                  case "ShieldOfTrust4YR45K":
                    ws[cellRef].v = "Shield of trust 4YR45K";
                    break;
                  case "EXTDWarrantyFOR4YR80K":
                    ws[cellRef].v = "EXTD Warranty FOR 4YR80K";
                    break;
                  case "STDFittings":
                    ws[cellRef].v = "STD Fittings";
                    break;
                  case "FastTag":
                    ws[cellRef].v = "FAST TAG";
                    break;
                  case "DiscountOffers":
                    ws[cellRef].v = "Discountoffers";
                    break;
                }
              }
            }
          }

          var wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

          // Save file with dynamic name
          var fileName = selectedCompanyCode + "QuotationSchemeData.xlsx";
          XLSX.writeFile(wb, fileName);
        },

        CommanReadCall: function (sUrl) {
          try {
            var that = this;
            BusyIndicator.show(0);
            $.ajax({
              url: sUrl,
              type: "GET",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
                password:
                  "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
              },
              success: function (data) {
                BusyIndicator.hide();
                that.getView().getModel("MainModel").setData("");
                var aItems = Array.isArray(data) ? data : data.results;
                if (!aItems || aItems.length === 0) {
                  MessageToast.show(
                    that.i18nModel.getText("msgNoSchemeForFilter")
                  );
                  return;
                }

                that.getView().getModel("MainModel").setData({ items: aItems });
                that.getView().getModel("MainModel").refresh(true);
              },
              error: function () {
                BusyIndicator.hide();
                // Get i18n text
                MessageToast.show(that.i18nModel.getText("msgFailedForFilter"));
              },
            });
          } catch (error) {
            // Get i18n text
            MessageToast.show(that.i18nModel.getText("msgTechnicalError"));
          }
        },

        onSearch: function () {
          BusyIndicator.show(0);
          var oFilterBar = this.getView().byId("filterbar");
          var sUrl = this.API + "/QuotationScheme";
          var aFilters = [];
          var oCompanyComboBox = this.byId("idCompanyCode");
          oCompanyComboBox.setValueState("None");

          oFilterBar.getFilterGroupItems().forEach(function (oItem) {
            var oControl = oItem.getControl();
            var sValue = oControl.getSelectedKey
              ? oControl.getSelectedKey()
              : null;

            if (sValue) {
              aFilters.push(
                encodeURIComponent(oItem.getName()) +
                  "=" +
                  encodeURIComponent(sValue)
              );
            }
          });

          if (aFilters.length) {
            sUrl += "?" + aFilters.join("&");
          }

          this.CommanReadCall(sUrl);
        },

        onClear: function () {
          var oFilterBar = this.getView().byId("filterbar");
          oFilterBar.getFilterGroupItems().forEach(function (oItem) {
            var oControl = oItem.getControl();
            if (oControl.setSelectedKey) {
              oControl.setSelectedKey("");
            } else if (oControl.setValue) {
              oControl.setValue("");
            }
          });
          this.oEditModel.setProperty("/isModelEditable", false);
          this.oEditModel.setProperty("/isVariantEditable", false);
          this.oEditModel.setProperty("/isTransmissionEditable", false);
        },

        //for Company code
        _readCompanyCode: function () {
          try {
            var that = this;
            BusyIndicator.show(0);
            $.ajax({
              url: "https://rest.shahportal.in/CompanyDetails",
              type: "GET",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
                password:
                  "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
              },
              success: function (data) {
                BusyIndicator.hide();
                var oModel = new JSONModel(data);

                // Set globally on the Component
                sap.ui.getCore().setModel(oModel, "CompanyDetails");
                this.getView().setModel(oModel, "CompanyDetails");
              }.bind(this),
              error: function () {
                BusyIndicator.hide();
                MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
              },
            });
          } catch (error) {
            MessageToast.show(that.i18nModel.getText("msgTechnicalError"));
          }
        },

        _fetchInitialData: function () {
          try {
            BusyIndicator.show(0);
            var that = this;
            var oModel = that.getOwnerComponent().getModel("MainModel"); // Use the existing model
            $.ajax({
              url: "https://rest.shahportal.in/QuotationScheme",
              type: "GET",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
                password:
                  "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
              },
              success: function (data) {
                BusyIndicator.hide();
                var aItems = Array.isArray(data) ? data : data.results;

                oModel.setData({
                  items: aItems,
                });
                oModel.refresh(true);
              },
              error: function () {
                BusyIndicator.hide();
                MessageToast.show(that.i18nModel.getText("msgFailedToFetch"));
              },
            });
          } catch (error) {
            MessageToast.show(that.i18nModel.getText("msgTechnicalError"));
          }
        },

        onItemPress: function (oEvent) {
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
          this.getRouter().navTo("RouteQuotationSchemeDetails", {
            data: oData.ID,
          });
        },

        onCreateform: function () {
          BusyIndicator.show(0);
          this.getRouter().navTo("RouteQuotationSchemeDetails", {
            data: "new",
          });
        },

        onUploadpress: function () {
          if (!this.oDialog) {
            this.oDialog = sap.ui.xmlfragment(
              "project3.fragment.QuotationScheme",
              this
            );
            this.getView().addDependent(this.oDialog);
          }

          this.oDialog.open();
        },

        onCreateDialogCancel: function () {
          var oComboBox = sap.ui.getCore().byId("idCompanyCodeComboBox");
          var oFileUploader = sap.ui.getCore().byId("idFileUploader");
          oComboBox.setSelectedKey("");
          oFileUploader.clear();
          this.oDialog.close();
        },

        onCreateDialogSubmit: async function () {
          try {
            var that = this;
            var oCompcode = sap.ui.getCore().byId("idCompanyCodeComboBox");
            var selectedBrand = oCompcode.getSelectedKey();
            var oFileUploader = sap.ui.getCore().byId("idFileUploader");

            // Validate Data
            if (!selectedBrand) {
              MessageToast.show(that.i18nModel.getText("msgInvalidCompany"));
              return;
            }

            if (
              !that._uploadedExcelData ||
              that._uploadedExcelData.length === 0
            ) {
              MessageToast.show(that.i18nModel.getText("msgNoDataInExcel"));
              return;
            }
            that._uploadedExcelData[0].company;
            var isCompanyMismatch = that._uploadedExcelData.some(
              (row) => row.Company.toLowerCase() !== selectedBrand.toLowerCase()
            );

            if (isCompanyMismatch) {
              MessageToast.show(
                that.i18nModel.getText("quoSchemecompanycodeandcnamemismatch")
              );
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
              oCompcode.setSelectedKey("");
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

        // Function to Delete Existing Data
        deleteData: function (selectedBrand) {
          try {
            return new Promise((resolve, reject) => {
              $.ajax({
                url: `https://rest.shahportal.in/QuotationScheme/*${selectedBrand}`,
                type: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
                  password:
                    "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
                },
                success: function (response) {
                  resolve(response);
                },
                error: function (error) {
                  reject(error);
                },
              });
            });
          } catch (error) {
            MessageToast.show(that.i18nModel.getText("msgTechnicalError"));
          }
        },

        // Function to Upload Data in Batches of 200
        uploadData: async function (formattedData) {
          var that = this;
          var batchSize = 200;
          var totalBatches = Math.ceil(formattedData.length / batchSize);
          this.totalUploadedRecords = 0;

          for (var i = 0; i < totalBatches; i++) {
            var batchData = formattedData.slice(
              i * batchSize,
              (i + 1) * batchSize
            );

            try {
              var response = await that.uploadBatch(batchData);
              this.totalUploadedRecords += response.results.affectedRows;
            } catch (error) {
              MessageToast.show(that.i18nModel.getText("msgTechnicalError"));
            }
          }
        },

        // Function to Upload a Single Batch
        uploadBatch: function (batchData) {
          try {
            return new Promise((resolve, reject) => {
              $.ajax({
                url: "https://rest.shahportal.in/QuotationScheme",
                type: "POST",
                headers: {
                  "Content-Type": "application/json",
                  name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
                  password:
                    "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
                },
                data: JSON.stringify(batchData),
                success: function (response) {
                  resolve(response);
                },
                error: function (error) {
                  reject(error);
                },
              });
            });
          } catch (error) {
            MessageToast.show(that.i18nModel.getText("msgTechnicalError"));
          }
        },

        //delete the row
        onDeletepress: function () {
          try {
            var that = this;
            var sMessage = that.i18nModel.getText("msgBoxConfirmDelete");
            var ID = this.byId("idQuotationtable")
              .getSelectedItem()
              .getBindingContext("MainModel")
              .getObject().ID;

            MessageBox.confirm(sMessage, {
              title: that.i18nModel.getText("msgBoxConfirmTitle"),
              onClose: function (oAction) {
                that.byId("idQuotationtable").removeSelections();
                if (oAction === MessageBox.Action.OK) {
                  BusyIndicator.show(0);
                  $.ajax({
                    url: `https://rest.shahportal.in/QuotationScheme/${ID}`,
                    type: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                      name: "$2a$10$wOoNA0328mDaC4aaCDuxcOvzZa4OXIrKf.auE7CVD0jeffnDwIaPK",
                      password:
                        "$2a$10$yfRxTZ.WmLYj6R6eHAzzpuqdkDJ5NgwF7U5lCr5K.O5/2vgz/fSRO",
                    },
                    success: function (response) {
                      BusyIndicator.hide();
                      that.byId("idQuotationtable").removeSelections();
                      that.onSearch();
                      // Get i18n text
                      MessageToast.show(
                        that.i18nModel.getText("msgSchemeDeleted")
                      );
                    },
                    error: function (error) {
                      BusyIndicator.hide();
                      MessageToast.show(
                        that.i18nModel.getText("quoschemeerrordeelterow") +
                          error
                      );
                    },
                  });
                }
              },
            });
          } catch (error) {
            MessageToast.show(that.i18nModel.getText("msgNoRowSelected"));
          }
        },
        onSignout: function () {
          this.navigateLoginPage();
        },
      }
    );
  }
);
