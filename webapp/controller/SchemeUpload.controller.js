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
        _RouteAppVisibility: function () {
          this.API =
            "https://www.rest.kalpavrikshatechnologies.com/SchemeUploade";
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
          this.getView().setModel(new JSONModel({ isFileValid: false })); //for createfragmentsubmit button
          this.MainModel = new JSONModel({ items: [] }); // Store table data
          this.getOwnerComponent().setModel(this.MainModel, "MainModel");
          // Fetch data on initialization
          this.CommomReadCall();
        },
        //for Search
        SU_onSearch: function () {
          BusyIndicator.show(0);
          var oView = this.getView();
          var oFilterBar = oView.byId("SU_id_Filterbar");
          var oModel = oView.getModel("MainModel");
          var sUrl = this.API;
          var aFilters = [];

          // Handle Model ComboBox
          var oModelComboBox = oView.byId("SU_id_ModelComboBox");
          var sModelSelectedKey = oModelComboBox.getSelectedKey();

          // Validate mandatory Model ComboBox
          if (!sModelSelectedKey) {
            oModelComboBox.setValueState("Error");
            BusyIndicator.hide();
            MessageToast.show("Please select a model");
            return;
          }
          oModelComboBox.setValueState("None");
          aFilters.push("model=" + encodeURIComponent(sModelSelectedKey));

          // Collect other filters
          oFilterBar.getFilterGroupItems().forEach(function (oItem) {
            var oControl = oItem.getControl();
            var sValue;

            // Handle different control types
            if (
              oControl instanceof sap.m.ComboBox ||
              oControl instanceof sap.m.Select
            ) {
              sValue = oControl.getSelectedKey();
            } else if (oControl instanceof sap.m.DatePicker) {
              sValue = oControl.getDateValue()?.toISOString().split("T")[0]; // Format date
            } else {
              sValue = oControl.getValue();
            }

            if (sValue) {
              aFilters.push(
                encodeURIComponent(oItem.getName()) +
                  "=" +
                  encodeURIComponent(sValue)
              );
            }
          });

          // Build final URL
          if (aFilters.length) {
            sUrl += (sUrl.includes("?") ? "&" : "?") + aFilters.join("&");
          }

          this.CommomReadCall(sUrl);
          BusyIndicator.hide();
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
          if (!oData || !Array.isArray(oData) || oData.length === 0) {
            MessageToast.show(this.i18nModel.getText("noData"));
            return;
          }
          const aCols = this.createColumnConfig();
          const oSettings = {
            workbook: { columns: aCols, hierarchyLevel: "Level" },
            dataSource: oData,
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
          ];
        },
        SU_onDeletepress: function () {
          var that = this;
          var oTable = this.byId("SU_id_Quotationtable"); // Verify table ID spelling
          var oSelectedItem = oTable.getSelectedItem();

          if (!oSelectedItem) {
            MessageToast.show(that.i18nModel.getText("msgSelectRow"));
            return;
          }

          var oContext = oSelectedItem.getBindingContext("MainModel");
          var sID = oContext.getProperty("ID");

          MessageBox.confirm(that.i18nModel.getText("msgBoxConfirmDelete"), {
            title: that.i18nModel.getText("msgBoxConfirm"),
            onClose: function (oAction) {
              if (oAction === MessageBox.Action.OK) {
                BusyIndicator.show(0);

                // 1. Fix potential URL typo ("SchemeUploade" -> "SchemeUpload"?)

                $.ajax({
                  url: `https://www.rest.kalpavrikshatechnologies.com/SchemeUploade/${sID}`,
                  type: "DELETE",
                  ContentType: "application/json",
                  headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password:
                      "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u", // Ensure backend understands JSON
                  },
                  data: JSON.stringify({
                    filter: {
                      ID: sID,
                    },
                  }),
                  success: function () {
                    BusyIndicator.hide();
                    // 4. Refresh the model after deletion
                    var oModel = that.getView().getModel("MainModel");
                    oModel.refresh(); // Force model reload
                    MessageToast.show(
                      that.i18nModel.getText("msgSchemeDeleted")
                    );
                  },
                  error: function (jqXHR) {
                    BusyIndicator.hide();
                    MessageToast.show(
                      jqXHR.responseJSON?.error ||
                        that.i18nModel.getText("quoschemeerrordeelterow")
                    );
                  },
                });
              }
              oTable.removeSelections();
            },
          });
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

          try {
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
            var response = await $.ajax({
              url: "https://www.rest.kalpavrikshatechnologies.com/SchemeUploade", // Check the correct URL
              type: "POST",
              contentType: "application/json", // Ensure proper JSON content type
              dataType: "json", // Expect JSON response
              data: JSON.stringify({ data: formattedData }), // Convert to JSON string
              headers: {
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u", // Ensure backend understands JSON
              },
            });

            if (response.success) {
              MessageToast.show("Data saved successfully!");

              // Update UI Model after successful save

              that.getView().setModel(that.MainModel, "MainModel");
              that.MainModel.refresh(true);
            } else {
              MessageToast.show("Failed to save data. Please try again.");
            }
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
        CommomReadCall: function () {
          var that = this;
          BusyIndicator.show(0); // Show loading indicator

          $.ajax({
            url: this.API,
            type: "GET",
            contentType: "application/json",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            success: function (response) {
              BusyIndicator.hide();

              if (response && response.data) {
                that.MainModel.setData({ data: response.data }); // Set fetched data
                that.getView().getModel("MainModel").refresh(true);
              } else {
                MessageToast.show("No data received from the server.");
              }
            },
            error: function (xhr, status, error) {
              BusyIndicator.hide();
              console.error("Error fetching data:", error);
              MessageToast.show("Error while fetching data.");
            },
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
