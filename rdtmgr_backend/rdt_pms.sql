-- MySQL dump 10.17  Distrib 10.3.25-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: 127.0.0.1    Database: rdt_pms
-- ------------------------------------------------------
-- Server version	10.3.25-MariaDB-0ubuntu0.20.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `delay_types`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `delay_types` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `description` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delay_types`
--

LOCK TABLES `delay_types` WRITE;
/*!40000 ALTER TABLE `delay_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `delay_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delays`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `delays` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `shift_id` int(10) unsigned NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `location_id` int(10) unsigned NOT NULL,
  `delay_type_id` int(10) unsigned DEFAULT NULL,
  `start_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `end_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `delays_location_id_start_date_uindex` (`location_id`,`start_date`),
  KEY `delays_shifts_id_fk` (`shift_id`),
  KEY `delays_delay_types_id_fk` (`delay_type_id`),
  CONSTRAINT `delays_delay_types_id_fk` FOREIGN KEY (`delay_type_id`) REFERENCES `delay_types` (`id`),
  CONSTRAINT `delays_location_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `delays_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delays`
--

LOCK TABLES `delays` WRITE;
/*!40000 ALTER TABLE `delays` DISABLE KEYS */;
/*!40000 ALTER TABLE `delays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locations`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `locations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `locations_parent_id_foreign` (`parent_id`),
  CONSTRAINT `locations_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
INSERT INTO `locations` VALUES (1,'Upsetter',NULL,1),(2,'Heat Treatment',NULL,1);
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned DEFAULT NULL,
  `location_id` int(10) unsigned NOT NULL,
  `shift_id` int(10) unsigned NOT NULL,
  `total_pieces` int(10) unsigned DEFAULT 0,
  `good_pieces` int(10) unsigned DEFAULT 0,
  `bad_pieces` int(10) unsigned DEFAULT 0,
  `start_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `end_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `insert_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `cycle_time` float,
  PRIMARY KEY (`id`),
  KEY `production_locations_id_fk` (`location_id`),
  KEY `production_products_id_fk` (`product_id`),
  KEY `production_shifts_id_fk` (`shift_id`),
  CONSTRAINT `production_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `production_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `production_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production`
--

LOCK TABLES `production` WRITE;
/*!40000 ALTER TABLE `production` DISABLE KEYS */;
/*!40000 ALTER TABLE `production` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_standards`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `production_standards` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `product_id` int(10) unsigned NOT NULL,
  `location_id` int(10) unsigned NOT NULL,
  `value` float(8,2) DEFAULT NULL,
  `unit` varchar(20) NOT NULL,
  `enabled` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `production_standards_product_id_foreign` (`product_id`),
  KEY `production_standards_location_id_foreign` (`location_id`),
  CONSTRAINT `production_standards_location_id_foreign` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `production_standards_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_standards`
--

LOCK TABLES `production_standards` WRITE;
/*!40000 ALTER TABLE `production_standards` DISABLE KEYS */;
INSERT INTO `production_standards` VALUES (1,1,1,40.00,'hits/hour',1),(2,2,1,40.00,'hits/hour',1),(3,3,1,40.00,'hits/hour',1),(4,4,1,40.00,'hits/hour',1),(5,5,1,40.00,'hits/hour',1),(6,6,1,40.00,'hits/hour',1),(7,7,1,40.00,'hits/hour',1),(8,8,1,40.00,'hits/hour',1),(9,9,1,40.00,'hits/hour',1),(10,10,1,40.00,'hits/hour',1),(11,11,1,40.00,'hits/hour',1),(12,12,1,40.00,'hits/hour',1),(13,13,1,40.00,'hits/hour',1),(14,14,1,40.00,'hits/hour',1),(15,15,1,40.00,'hits/hour',1),(16,16,1,42.00,'hits/hour',1),(17,17,1,42.00,'hits/hour',1),(18,18,1,42.00,'hits/hour',1),(19,19,1,42.00,'hits/hour',1),(20,20,1,43.00,'hits/hour',1),(21,21,1,43.00,'hits/hour',1),(22,1,2,10.70,'joints/hour',1),(23,2,2,15.80,'joints/hour',1),(24,3,2,20.00,'joints/hour',1),(25,4,2,20.00,'joints/hour',1),(26,5,2,17.30,'joints/hour',1),(27,6,2,15.00,'joints/hour',1),(28,7,2,16.50,'joints/hour',1),(29,8,2,24.00,'joints/hour',1),(30,9,2,17.80,'joints/hour',1),(31,10,2,17.80,'joints/hour',1),(32,11,2,19.90,'joints/hour',1),(33,12,2,19.90,'joints/hour',1),(34,13,2,21.60,'joints/hour',1),(35,14,2,21.60,'joints/hour',1),(36,15,2,16.70,'joints/hour',1),(37,16,2,21.60,'joints/hour',1),(38,17,2,23.70,'joints/hour',1),(39,18,2,31.40,'joints/hour',1),(40,19,2,19.30,'joints/hour',1),(41,20,2,21.50,'joints/hour',1),(42,21,2,24.47,'joints/hour',1);
/*!40000 ALTER TABLE `production_standards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `enabled` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'7.0#32.00',1),(2,'7.0#29.00',1),(3,'5 1/2 #20 PE',1),(4,'5 1/2 #20 UC',1),(5,'5 1/2 #23 P',1),(6,'5 1/2 #23 UC',1),(7,'5 1/2#17.00 PE',1),(8,'5.0 #19 U',1),(9,'4.5#15.10',1),(10,'4.5#15.10 UC',1),(11,'4.5#13.50',1),(12,'4.5#13.50 UC',1),(13,'4 1/2 12,75',1),(14,'4.5#12.75 UC',1),(15,'4.5#16.60',1),(16,'3 1/2 #9,5',1),(17,'2 7/8 #9,6',1),(18,'2 7/8 #7.90',1),(19,'2 3/8 #7,35',1),(20,'2 3/8 #6,6',1),(21,'2 3/8 #5,8',1);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shift_definitions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shift_definitions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(10) unsigned NOT NULL,
  `start_time` time DEFAULT NULL,
  `amount` int(10) unsigned NOT NULL,
  `enabled` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shift_definitions_location_id_start_time_amount_uindex` (`location_id`,`start_time`,`amount`),
  CONSTRAINT `shifts_location_id_foreign` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shift_definitions`
--

LOCK TABLES `shift_definitions` WRITE;
/*!40000 ALTER TABLE `shift_definitions` DISABLE KEYS */;
INSERT INTO `shift_definitions` VALUES (1,1,'08:00:00',2,1),(2,2,'08:00:00',2,1);
/*!40000 ALTER TABLE `shift_definitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shifts`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shifts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `location_id` int(10) unsigned NOT NULL,
  `start_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `end_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `position` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shifts_end_date_location_id_uindex` (`end_date`,`location_id`),
  UNIQUE KEY `shifts_start_date_location_id_uindex` (`start_date`,`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shifts`
--

LOCK TABLES `shifts` WRITE;
/*!40000 ALTER TABLE `shifts` DISABLE KEYS */;
/*!40000 ALTER TABLE `shifts` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2021-04-21 12:36:25
