sap.ui.define([
    "./BaseController", //call base controller 
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";
    return BaseController.extend("sap.ui.com.project1.controller.TilePage", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("TilePage").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this.AppVisibilityReadCall();
        },

        AppVisibilityReadCall: async function () {
            try {
                this.getBusyDialog()
                this.commonLoginFunction();
                const oLoginModel = this.getOwnerComponent().getModel("LoginModel");
                let filter = { Role: oLoginModel.getProperty("/Role") }
                const oData = await this.ajaxReadWithJQuery("HM_AppVisibility", filter);
                var oModel = new JSONModel(oData.data[0]);
                this.getOwnerComponent().setModel(oModel, "TileVisibility");
            } catch (err) {
                this.closeBusyDialog()
                MessageToast.show(err.message || err.responseText);
            } finally {
                this.closeBusyDialog()
            }
        },

        TileV_onpressInbox: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteAdmin");
        },

        Tile_onLogPress: function () {
            this.CommonLogoutFunction();
        },

        TileV_onpressroomdetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomDetails");
        },

        TileV_onpressbeddetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBedDetails");
        },

        TileV_onpressextrafacilities: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitis", { value: "Facilities", });
        },

        TileV_onpressBedImages: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteRoomImages");
        },

        TileV_onpressfacilities: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteFacilitiesDetails");
        },

        TileV_onpressmaintaindata: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteMaintainData");
        },

        TileV_onpressBranchdata: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteBranchData");
        },

        TileV_onpresshostelfeatures: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostelFeatures");
        },

        TileV_onpressManageInvoice: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageInvoice");
        },

        TileV_onpressCouponDetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCouponDetails");
        },

        TileV_onpressManageStaff: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageStaff");
        },

        TileV_onpressManageVendor: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteManageVendor");
        },

        TileV_onpressPayment: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RoutePayment");
        },

        TileV_onpressDeposit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDeposit");
        },

        TileV_onpressdashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDashboard");
        },

        TileV_onpresshosteldashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostelDashboard");
        },

        TileV_onpresscustomerreview: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteCustomerReview");
        },

        TileV_onpresscomplaintdashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteComplainDashboard", {
                sPath: "Dashboard"
            });
        },
        TileV_onpressComplaintdetails: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteComplaintDetails");
        },

        TileV_onpressdamage: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDamage");
        },

        TileV_onpressdamagedashboard: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDamageDashboard");
        },

        // onStartGuide: function () {
        //     if (!this._oGuideDialog) {
        //         this._oGuideDialog = new sap.m.Dialog({
        //             title: "Steps to Know",
        //             contentWidth: "60vw",
        //             contentHeight: "36.8vw",
        //             resizable: true,
        //             draggable: true,
        //             verticalScrolling: false,
        //             horizontalScrolling: false,
        //             content: [
        //                 new sap.m.Image({
        //                     src: "image/Guide.jpg",
        //                     width: "100%",
        //                     height: "100%",
        //                     decorative: false,
        //                     densityAware: false
        //                 }).addStyleClass("PG-fitImage") 
        //             ],
        //             endButton: new sap.m.Button({
        //                 text: "Close",
        //                 press: function () {
        //                     this._oGuideDialog.close();
        //                 }.bind(this)
        //             }).addStyleClass("myUnifiedBtn")
        //         }).addStyleClass("barheader PG-noPaddingDialog"); 
        //         this.getView().addDependent(this._oGuideDialog);
        //     }
        //     this._oGuideDialog.open();
        // },

        Tile_onHomePress: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteHostel");
        },

        // ─── ROLE ACCESS CONFIG ────────────────────────────────────────────────────
        // Maps each role to its guide metadata
        _getRoleGuideConfig: function (sRole) {
            var oRoleMap = {
                "SuperAdmin": {
                    roleLabel: "Super Admin",
                    accessLevel: "Full Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://shield",
                    summary: "Unrestricted access to manage all Branches, Staffs, Vendors, Finances, and System-wide configurations.",
                    accessItems: [
                        {
                            icon: "sap-icon://building",
                            color: "#0070f2",
                            label: "Infrastructure",
                            detail: "Manage Branches, Rooms, Beds, Facilities and Amenities"
                        },
                        {
                            icon: "sap-icon://customer",
                            color: "#0070f2",
                            label: "Operations",
                            detail: "Full control over Bookings, Invoices, Deposits & Coupons"
                        },
                        {
                            icon: "sap-icon://group",
                            color: "#0070f2",
                            label: "User Management",
                            detail: "Administer Staff members and Vendors"
                        },
                        {
                            icon: "sap-icon://feedback",
                            color: "#0070f2",
                            label: "Feedback & Issues",
                            detail: "Monitor Complaints, Damages and Reviews"
                        },
                        {
                            icon: "sap-icon://business-objects-experience",
                            color: "#0070f2",
                            label: "Analytics",
                            detail: "Real-time insights across all Dashboards"
                        }
                    ]
                },
                "Admin": {
                    roleLabel: "Branch Admin",
                    accessLevel: "Branch-Wide Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://building",
                    summary: "Unrestricted access to manage all Branches, Staff, Finances, and System-wide configurations",
                    accessItems: [
                        {
                            icon: "sap-icon://building",
                            color: "#0070f2",
                            label: "Infrastructure",
                            detail: "Manage Branches, Rooms, Beds, Facilities and Amenities"
                        },
                        {
                            icon: "sap-icon://customer",
                            color: "#0070f2",
                            label: "Operations",
                            detail: "Full control over Bookings, Invoices, Deposits & Coupons"
                        },
                        {
                            icon: "sap-icon://group",
                            color: "#0070f2",
                            label: "User Management",
                            detail: "Administer Staff members"
                        },
                        {
                            icon: "sap-icon://feedback",
                            color: "#0070f2",
                            label: "Feedback & Issues",
                            detail: "Monitor Complaints, Damages and Reviews"
                        },
                        {
                            icon: "sap-icon://business-objects-experience",
                            color: "#0070f2",
                            label: "Analytics",
                            detail: "Real-time insights across all Dashboards"
                        }
                    ]
                },
                "Branch Manager": {
                    roleLabel: "Branch Manager",
                    accessLevel: "Branch-Scoped Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://manager",
                    summary: "Unrestricted access to all operations specific to your allocated Branch — Staff, Finances, and System-wide configurations",
                    accessItems: [
                        {
                            icon: "sap-icon://building",
                            color: "#0070f2",
                            label: "Infrastructure",
                            detail: "Manage Rooms, Beds, Facilities and Amenities"
                        },
                        {
                            icon: "sap-icon://customer",
                            color: "#0070f2",
                            label: "Operations",
                            detail: "Full control over Bookings, Invoices, Deposits & Coupons"
                        },
                        {
                            icon: "sap-icon://group",
                            color: "#0070f2",
                            label: "User Management",
                            detail: "Administer Staff members"
                        },
                        {
                            icon: "sap-icon://feedback",
                            color: "#0070f2",
                            label: "Feedback & Issues",
                            detail: "Monitor Complaints, Damages and Reviews"
                        },
                        {
                            icon: "sap-icon://business-objects-experience",
                            color: "#0070f2",
                            label: "Analytics",
                            detail: "Real-time insights across all Dashboards"
                        }
                    ]
                },
                "Front Office Employee": {
                    roleLabel: "Front Office Employee",
                    accessLevel: "Mixed Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://retail-store",


                    summary: "As a Front Office Employee, you have full access to customer-facing operations (bookings, invoices, complaints) and view-only access to branch-level data.",
                    accessItems: [
                        { icon: "sap-icon://customer", color: "#0070f2", label: "Full: Customers & Invoices", detail: "Manage customers, invoices, payments and deposits." },
                        { icon: "sap-icon://display", color: "#e9730c", label: "View Only: Config Data", detail: "Branch, Bed, Room, Facilities, Amenities and coupons are read-only." },

                    ]
                },
                "Housekeeping": {
                    roleLabel: "House Keeping",
                    accessLevel: "Limited Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://customer-view",
                    summary: "As a Housekeeping staff member, your access is restricted to Complaint & Complaint Dashbaord",
                    accessItems: [
                        { icon: "sap-icon://customer-view", color: "#0070f2", label: "View: Complaint Details", detail: "Read-only access to complaint details" },
                        { icon: "sap-icon://alert", color: "#0070f2", label: "View: Complaint Dashboard", detail: "Read-only access to complaint dashboard." },
                    ]
                },
                "ManageVendor": {
                    roleLabel: "Vendor Manager",
                    accessLevel: "Vendor-Only Access",
                    accessState: "Success",
                    accessIcon: "sap-icon://supplier",
                    summary: "As a Vendor Manager, you have access exclusively to the vendor management module. All hostel operations, customer data, and dashboards are outside your scope.",
                    accessItems: [
                        { icon: "sap-icon://supplier", color: "#0070f2", label: "Vendor Management", detail: "Full access to create and manage  vendors" },
               
                    ]
                }
            };

            return oRoleMap[sRole] || {
                roleLabel: sRole || "User",
                accessLevel: "Custom Access",
                accessState: "None",
                accessIcon: "sap-icon://person-placeholder",
                summary: "Your access is configured by your system administrator. Use the tour below to explore available modules.",
                accessItems: [
                    { icon: "sap-icon://information", color: "#0070f2", label: "Contact Admin", detail: "Reach out to your Super Admin for access queries." }
                ]
            };
        },

        // ─── STEP 1: Show the role overview popover ────────────────────────────────
        onStartGuide: function () {
            var oView = this.getView();
            var oComponent = this.getOwnerComponent();
            var oVisibilityModel = oComponent.getModel("TileVisibility");
            var oLoginModel = oComponent.getModel("LoginModel");

            if (!oVisibilityModel || !oVisibilityModel.getData()) {
                sap.m.MessageToast.show("Please wait, checking permissions...");
                return;
            }

            var sRole = oLoginModel ? oLoginModel.getProperty("/Role") : "";
            var oConfig = this._getRoleGuideConfig(sRole);

            if (!this._oRoleGuideModel) {
                this._oRoleGuideModel = new sap.ui.model.json.JSONModel();
                oComponent.setModel(this._oRoleGuideModel, "roleGuideModel");
            }
            this._oRoleGuideModel.setData(oConfig);

            // Pre-build tile steps so they're ready when tour starts
            this._buildTileSteps();

            var that = this;
            if (!this._oRoleGuideDialog) {
                this.loadFragment({
                    name: "sap.ui.com.project1.fragment.RoleGuidePopover"  // keep same file name
                }).then(function (oDialog) {
                    that._oRoleGuideDialog = oDialog;
                    oDialog.setModel(that._oRoleGuideModel, "roleGuideModel");
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oRoleGuideDialog.setModel(this._oRoleGuideModel, "roleGuideModel");
                this._oRoleGuideDialog.open();
            }
        },

        // ─── STEP 1 helpers ────────────────────────────────────────────────────────
        onBeforeRolePopoverClose: function (oEvent) {
            // Allow it to close freely (unlike the tour popover, this one can be dismissed)
        },

        onSkipRoleGuide: function () {
            if (this._oRoleGuideDialog && this._oRoleGuideDialog.isOpen()) {
                this._oRoleGuideDialog.close();
            }
        },

        // ─── STEP 2: "Start Tour" pressed — close role popover, begin tile tour ───
        onStartTileGuide: function () {
            var that = this;
            if (this._oRoleGuideDialog && this._oRoleGuideDialog.isOpen()) {
                this._oRoleGuideDialog.attachEventOnce("afterClose", function () {
                    that._launchTileSteps();
                });
                this._oRoleGuideDialog.close();
            } else {
                this._launchTileSteps();
            }
        },

        _buildTileSteps: function () {
            var oView = this.getView();
            var oComponent = this.getOwnerComponent();
            var oI18nModel = oComponent.getModel("i18n");
            var oLoginModel = oComponent.getModel("LoginModel");
            var oBundle = oI18nModel ? oI18nModel.getResourceBundle() : null;
            var sRole = oLoginModel ? oLoginModel.getProperty("/Role") : "";

            // ── Master tile config ─────────────────────────────────────────────────
            // descKey      = default full-access i18n key
            // descKey_view = read-only variant key (used when role has view-only access)
            // viewOnlyRoles = roles that get the _view variant for this tile
            var aTileConfig = [
                // ── Category 1: Setup & Configuration ────────────────────────────
                {
                    id: "branchTile",
                    headerKey: "manageBranchDetails",
                    descKey: "tour_desc_branch",
                    descKey_view: "tour_desc_branch_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "bedTile",
                    headerKey: "manageBedDetails",
                    descKey: "tour_desc_bed",
                    descKey_view: "tour_desc_bed_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "roomTile",
                    headerKey: "tileManageRoomDetails",
                    descKey: "tour_desc_room",
                    descKey_view: "tour_desc_room_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "customerTile",
                    headerKey: "manageExtraFacilities",
                    descKey: "tour_desc_facilities",
                    descKey_view: "tour_desc_facilities_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "id1roomTile",
                    headerKey: "maintainHostelFeatures",
                    descKey: "tour_desc_hostelFeatures",
                    descKey_view: "tour_desc_hostelFeatures_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "id2roomTile",
                    headerKey: "manageCouponDetails",
                    descKey: "tour_desc_coupon",
                    descKey_view: "tour_desc_coupon_view",
                    viewOnlyRoles: ["Front Office Employee"]
                },
                {
                    id: "id5roomTile",
                    headerKey: "manageStaff",
                    descKey: "tour_desc_staff"
                    // No viewOnlyRoles — staff tile is fully hidden for Front OfficeEmployee (not shown)
                },
                {
                    id: "id6roomTile",
                    headerKey: "manageVendors",
                    descKey: "tour_desc_vendor"
                    // ManageVendor role sees only this tile — full access
                },

                // ── Category 2: Operations ────────────────────────────────────────
                {
                    id: "id3roomTile",
                    headerKey: "manageCustomerDetails",
                    descKey: "tour_desc_customer"
                    // Full access for all roles that can see it
                },
                {
                    id: "id4roomTile",
                    headerKey: "invoiceDetails",
                    descKey: "tour_desc_invoice"
                },
                {
                    id: "id8roomTile",
                    headerKey: "returnDeposit",
                    descKey: "tour_desc_deposit"
                },
                {
                    id: "id7roomTile",
                    headerKey: "payment",
                    descKey: "tour_desc_payment"
                },
                {
                    id: "TP_DamageTile",
                    headerKey: "damageTracking",
                    descKey: "tour_desc_damage"
                },
                {
                    id: "id12roomTile",
                    headerKey: "Complaintdetails",
                    descKey: "tour_desc_complaint",
                    descKey_view: "tour_desc_complaint_view",
                    viewOnlyRoles: ["Housekeeping"]
                },
                {
                    id: "id11roomTile",
                    headerKey: "customerReview",
                    descKey: "tour_desc_customerReview",
                    descKey_view: "tour_desc_customerReview_view",
                    viewOnlyRoles: ["Housekeeping"]
                },



                // ── Dashboards ────────────────────────────────────────────────────
                {
                    id: "id9roomTile",
                    headerKey: "bookingDashboard",
                    descKey: "tour_desc_bookingDashboard"
                },
                {
                    id: "id10roomTile",
                    headerKey: "paymentdashboard",
                    descKey: "tour_desc_paymentDashboard"
                },
                {
                    id: "TP_ComplaintDashBoardTile",
                    headerKey: "complainDashboard",
                    descKey: "tour_desc_complainDashboard",
                    descKey_view: "tour_desc_complainDashboard_view",
                    viewOnlyRoles: ["Housekeeping"]
                },
                {
                    id: "TP_DamageDashboard",
                    headerKey: "damageDashboard",
                    descKey: "tour_desc_damageDashboard"
                }
            ];

            // ── Role-aware description resolver ───────────────────────────────────
            var fnResolveDesc = function (config) {
                var bIsViewOnly = config.viewOnlyRoles &&
                    config.viewOnlyRoles.indexOf(sRole) !== -1;


                var sKey = (bIsViewOnly && config.descKey_view)
                    ? config.descKey_view
                    : config.descKey;

                return oBundle ? oBundle.getText(sKey) : sKey;
            };

            var aAllSteps = aTileConfig.map(function (config) {
                return {
                    ui5Id: config.id,
                    title: oBundle ? oBundle.getText(config.headerKey) : config.headerKey,
                    description: fnResolveDesc(config),
                    media: ""
                };
            });

            // Only include tiles that are visible AND rendered in DOM
            this._aPendingTileSteps = aAllSteps.filter(function (step) {
                var oControl = oView.byId(step.ui5Id);
                return oControl &&
                    oControl.getVisible &&
                    oControl.getVisible() &&
                    !!oControl.getDomRef();
            });
        },
        _launchTileSteps: function () {
            if (!this._aPendingTileSteps || !this._aPendingTileSteps.length) {
                sap.m.MessageToast.show("No tiles available for the guide.");
                return;
            }
            this.initUniversalTour(this._aPendingTileSteps);
        },

    })
})