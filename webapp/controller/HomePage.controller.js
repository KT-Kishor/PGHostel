sap.ui.define(
  [
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (BaseController, utils, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.HomePage",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteHomePage")
            .attachMatched(this._onRouteMatched, this);
          var oFormData = new JSONModel({
            CustomerName: "",
            CompanyName: "",
            Email: "",
            Address: "",
            TimeSlot: "",
            MobileNo: "",
            Comments: "",
          });

          this.getView().setModel(oFormData, "formData");
        },

        _onRouteMatched: function () {
          var oNavContainer = this.byId("pageContainer");
          oNavContainer.to(this.byId("idHome"));
          this.i18nModel = this.getView().getModel("i18n").getResourceBundle();

          var oCarousel = this.byId("videoCarousel");

          var videoUrls = [
            "../video/Employee offer.mp4",
            "../video/Self Service.mp4",
            "../video/Employee details Part 1.mp4",
            "../video/Quotation.mp4",
            "../video/Scheme upload.mp4",
          ];

          // Add videos dynamically to the carousel
          videoUrls.forEach(function (url, index) {
            var oHtmlControl = new sap.ui.core.HTML({
              content:
                '<video width="100%" height="100%" autoplay muted loop>' +
                '<source src="' +
                url +
                '" type="video/mp4">' +
                "</video>",
            });

            var oVBox = new sap.m.VBox({
              alignItems: "Center",
              items: [
                new sap.m.Title({
                  level: "H2",
                  class: "custom-text2",
                }),
                oHtmlControl,
              ],
            });

            oVBox.addStyleClass("sapUiTinyMargin"); // Apply transparent background class
            oCarousel.addPage(oVBox);
          });

          var iCurrentIndex = 0;
          var aPages = oCarousel.getPages(); // Get all slides

          function autoSlide() {
            if (aPages.length > 1) {
              iCurrentIndex = (iCurrentIndex + 1) % aPages.length; // Move to next slide
              oCarousel.setActivePage(aPages[iCurrentIndex]); // Update active slide
            }
          }
          setInterval(autoSlide, 30000);

          var oData = {
            pages: [
              {
                pageId: "companyPageId",
                header: "Company info",
                title: "Kalpavriksha Technologies",
                titleUrl: "",
                icon: "./image/logo.jpg",
                displayShape: "circle",
                description: "Cell Phone : +91 9686145959",
                groups: [
                  {
                    heading: "Contact Details",
                    elements: [],
                  },
                  {
                    heading: "Main Contact",
                    elements: [
                      {
                        label: "WhatsApp Us On",
                        value: "+91 9686145959",
                        elementType: "pageLink",
                        pageLinkId: "companyEmployeePageId",
                      },
                      {
                        label: "Email Us",
                        value: "accounts@kalpavrikshatechnologies.com",
                        emailSubject: "Subject",
                        elementType: "email",
                      },
                      {
                        label: "Address",
                        value:
                          "#111 Karekal layout , Sharanbasaveshwar Nagar, Near Naganhalli Railway Over Bridge, Gulbarga, Karnataka 585102, IN",
                        elementType: "text",
                      },
                      {
                        label: "Find Us On Google Map",
                        value: "Google Map",
                        elementType: "link",
                        url: "https://maps.app.goo.gl/zjt8Xy3FsgV13veMA",
                      },
                      {
                        label: "Follow Us On Linked in",
                        value: "Linked in",
                        elementType: "link",
                        url: "https://www.linkedin.com/company/kalpavriksha-technologies/",
                      },
                    ],
                  },
                ],
              },
            ],
          };

          var oTData = new JSONModel({
            Name: "",
            CollegeName: "",
            EmailID: "",
            MobileNo: "",
            SelectCourse: "",
            Comments: "",
          });

          this.getView().setModel(oTData, "TraineeData");
        },

        onTabSelect: function (oEvent) {
          var oItem = oEvent.getParameter("item");
          this.byId("pageContainer").to(this.byId(oItem.getKey()));
        },

        onTilePress: function () {
          var iframe = document.createElement("iframe");
          iframe.setAttribute("width", "640");
          iframe.setAttribute("height", "360");
          iframe.setAttribute(
            "src",
            "https://www.youtube.com/embed/PdBkOcrmqbo"
          );
          iframe.setAttribute("frameborder", "0");
          iframe.setAttribute(
            "allow",
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          );
          iframe.setAttribute("allowfullscreen", "");

          var oContainer = this.byId("pageContainer").getDomRef();
          oContainer.innerHTML = ""; // Clear any existing content
          oContainer.appendChild(iframe);
        },
        onpressLogin: function () {
          this.getRouter().navTo("RouteLoginPage");
        },
        //linkdin link
        onClicklinkdin: function () {
          sap.m.URLHelper.redirect(
            "https://www.linkedin.com/company/kalpavriksha-technologies/",
            true
          );
        },
        //Address link
        onPressAddress: function () {
          sap.m.URLHelper.redirect(
            "https://www.google.com/maps/dir/17.3390052,76.8399401/kalpavriksha+technologies/@17.3190648,76.8242773,14z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!1s0x3bc8c122d9181afd:0x6af9e90eb1f5fc8f!2m2!1d76.8487474!2d17.299382?entry=ttu",
            true
          );
        },
        //navigate to home page
        onpressHome: function () {
          this.getRouter().navTo("RouteHomePage");
        },

        validateCompnayname: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        validateName: function (oEvent) {
          utils._LCvalidateName(oEvent);
        },
        validateMobileNo: function (oEvent) {
          utils._LCvalidateMobileNumber(oEvent);
        },
        validateEmail: function (oEvent) {
          utils._LCvalidateEmail(oEvent);
        },
        ValidateCommonFields: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },

        onDemoformSave: function () {
          var oModel = this.getView().getModel("formData");
          var oData = JSON.parse(JSON.stringify(oModel.getData())); // Deep copy to avoid reference issues
          var payload = [oData];
          var that = this;

          // Form Validation
          if (
            utils._LCvalidateMandatoryField(this.byId("idCompanyname"), "ID") &&
            utils._LCvalidateName(this.byId("idcustomername"), "ID") &&
            utils._LCvalidateEmail(this.byId("idCustmailid"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("idCustaddress"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("idtimeslot"), "ID") &&
            utils._LCvalidateMobileNumber(this.byId("idmobilenumber"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("idcomment"), "ID")
          ) {
            // AJAX Call to Save Data
            $.ajax({
              url: "https://www.rest.kalpavrikshatechnologies.com/CustomerDemo",
              type: "POST",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              data: JSON.stringify(payload),
              success: function (response) {
                var resetData = {
                  CustomerName: "",
                  CompanyName: "",
                  Email: "",
                  Address: "",
                  TimeSlot: "",
                  MobileNo: "",
                  Comments: "",
                };

                oModel.setData(resetData);
                oModel.refresh(true);
                MessageToast.show("Data saved successfully!");

                that.SendEmail(oData.Email, oData.CustomerName);
                // AJAX Call to Send Email
              },
              error: function (xhr, status, error) {
                MessageToast.show("Error saving data. Please try again.");
              },
            });
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        },

        SendEmail: function (Email, CustomerName) {
          // Prepare email payload
          var emailPayload = {
            to: Email,
            toName: CustomerName,
            Type: "CustDemo",
          };
          $.ajax({
            url: "https://www.rest.kalpavrikshatechnologies.com/SendEmail",
            type: "POST",
            headers: {
              "Content-Type": "application/json",
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password:
                "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            data: JSON.stringify(emailPayload),
            success: function (emailResponse) {
              MessageToast.show("Confirmation email sent!");
            },
            error: function (emailError) {
              MessageToast.show("Error sending confirmation email.");
            },
          });
        },
        Tbtn_onPress: function () {
          var oView = this.getView();
          if (!this.oDialog) {
            sap.ui.core.Fragment.load({
              name: "sap.kt.com.minihrsolution.fragment.TraningForm",
              controller: this,
            }).then(
              function (oDialog) {
                this.oDialog = oDialog;
                oView.addDependent(this.oDialog);
                this.oDialog.open();
              }.bind(this)
            );
          } else {
            this.oDialog.open();
          }
        },
        FTF_onlivename: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        FTF_onliveclg: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        FTF_onlivecomment: function (oEvent) {
          utils._LCvalidateMandatoryField(oEvent);
        },
        FTF_onlivemail: function (oEvent) {
          utils._LCvalidateEmail(oEvent);
        },
        FTF_onlivemobile: function (oEvent) {
          utils._LCvalidateMobileNumber(oEvent);
        },

        FTF_onSubmitForm: function () {
          var oModel = this.getView().getModel("TraineeData");
          var oData = JSON.parse(JSON.stringify(oModel.getData())); // Deep copy

          // Get MultiComboBox Selected Values
          var oMultiComboBox = sap.ui.getCore().byId("FTF_idMultiSelectCourse");
          var aSelectedKeys = oMultiComboBox
            .getSelectedKeys()
            .filter((key) => key.trim() !== ""); // Get all selected keys as an array

          // Convert Array to Comma-Separated String
          oData.SelectCourse = aSelectedKeys.join(", "); // Example: "SAP UI5, HANA, OData"

          var opayload = [oData]; // Wrap data in an array

          var that = this;
          if (
            utils._LCvalidateMandatoryField(
              sap.ui.getCore().byId("FTF_idName"),
              "ID"
            ) &&
            utils._LCvalidateMandatoryField(
              sap.ui.getCore().byId("FTF_idClgname"),
              "ID"
            ) &&
            utils._LCvalidateEmail(sap.ui.getCore().byId("FTF_idmail"), "ID") &&
            utils._LCvalidateMobileNumber(
              sap.ui.getCore().byId("FTF_idMobnumber"),
              "ID"
            ) &&
            utils._LCvalidateMandatoryField(
              sap.ui.getCore().byId("FTF_idcomments"),
              "ID"
            )
          ) {
            //  AJAX Call to Save Data
            $.ajax({
              url: "https://www.rest.kalpavrikshatechnologies.com/Training",
              type: "POST",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              data: JSON.stringify({ data: opayload }), //  Sending formatted data
              success: function (response) {
                var resetData = {
                  Name: "",
                  CollegeName: "",
                  EmailID: "",
                  MobileNo: "",
                  SelectCourse: [], //  Reset MultiComboBox
                  Comments: "",
                };

                oModel.setData(resetData);
                oModel.refresh(true);
                that.oDialog.close();
                MessageToast.show("Data saved successfully!");
              },
              error: function (xhr, status, error) {
                MessageToast.show("Error saving data. Please try again.");
              },
            });
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        },

        FTF_onCancelform: function () {
          this.oDialog.close();
        },
      }
    );
  }
);
